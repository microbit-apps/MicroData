namespace microdata {
    /**
     * This is presently unused on this /main branch due to memory constraints. The distributedLoggingProtocol is used in its stead.
     * The no-jacdac-mode uses this feature fully, but with no Jacdac support.
     * 
     * This version supports the Radio logging in addition to its other logging modes.
     * 
     * In the future there shouldn't be a trade-off between these features.
     */


    /**
     * Sensor Selection cycles between 'animations' of the options; animations are an LED loop specific to that sensor.
     * Mutated by the A & B button
     */
    const enum UI_MODE {
        SENSOR_SELECTION,
        LOGGING
    };


    /**
     * Represents the internal state of the UI diplay when in SENSOR_SELECTION UI_MODE;
     * 
     * Mutated by the A & B button & .dynamicSensorSelectionLoop()
     * 
     * Which LED should be shown and what Sensor object should it be converted to when complete.
     * see .uiSelectionToSensor()
     * 
     * Notice the RADIO element; which is not a sensor; see .uiSelectionToSensor() since it is handled differently.
     */
    const enum UI_SENSOR_SELECT_STATE {
        ACCELERATION,
        TEMPERATURE,
        LIGHT,
        MAGNET,
        RADIO
    };

    /** For module inside of B button. */
    const SENSOR_SELECTION_SIZE = 5;
    /** How long should each LED picture be shown for? Series of pictures divide this by how many there are. */
    const SHOW_EACH_SENSOR_FOR_MS: number = 1000;

    /**
     * Simple class to enable the use of MicroData w/o an Arcade Shield for recording data for the sensors listed in UI_SENSOR_SELECT_STATE.
     * Invoked if an arcade shield is not detected from app.ts
     * The LED is used to represent sensor options, the user can press A to select one; which starts logging.
     * Or press B to move onto the next one.
     * 
     * Logging happens every second and is indefinite. The user may cancel the logging via the B button.
     * 
     * Whilst the sensors are cycled between the sensor being displayed may dynamically update if the readings from that sensor are in excess.
     *      See .dynamicSensorSelectionLoop()
     *      It checks all sensors inside UI_SENSOR_SELECT_STATE; if there is one that has a reading beyond the threshold then it will switch this.uiSensorSelectState to that sensor.
     *      This allows the user to cycle between UI elements phsyically - by shining light on or shaking the microbit.
     * 
     * Fibers and special waiting functions .waitUntilSensorSelectStateChange & .waitUntilUIModeChanges are required to maintain low-latency and the dynamic behaviour described above.
     */
    export class NoArcadeShieldMode {
        private app: App;
        /** Mutated by the A & B button */
        private uiMode: UI_MODE;
        /** Mutated by the B button & .dynamicSensorSelectionLoop() */
        private uiSensorSelectState: UI_SENSOR_SELECT_STATE;

        constructor(app: App) {
            this.app = app;
            this.uiMode = UI_MODE.SENSOR_SELECTION;
            this.uiSensorSelectState = UI_SENSOR_SELECT_STATE.ACCELERATION;

            // A Button
            input.onButtonPressed(1, () => {
                if (this.uiMode == UI_MODE.SENSOR_SELECTION) {
                    this.uiMode = UI_MODE.LOGGING;
                    this.log();
                }
            })

            // B Button
            input.onButtonPressed(2, () => {
                if (this.uiMode == UI_MODE.SENSOR_SELECTION)
                    this.uiSensorSelectState = (this.uiSensorSelectState + 1) % SENSOR_SELECTION_SIZE

                else if (this.uiMode == UI_MODE.LOGGING) {
                    this.uiMode = UI_MODE.SENSOR_SELECTION;
                    this.dynamicSensorSelectionLoop();
                    this.showSensorIcon();
                }
            })

            this.dynamicSensorSelectionLoop();
            this.showSensorIcon();
        }


        /**
         * Runs in background fiber.
         * Polls all UI_SENSOR_SELECT_STATE except RADIO for abormally high readings.
         * If the reading is beyond the threshold then this.uiSensorSelectState is mutated.
         * 
         * Turned off if not in UI_MODE.SENSOR_SELECTION
         * 
         * Invoked at start and when moving back from logging via pressing the B button.
         */
        private dynamicSensorSelectionLoop() {
            const dynamicInfo = [
                {sensor: new AccelerometerXSensor(), uiState: UI_SENSOR_SELECT_STATE.ACCELERATION, threshold: 0.25}, 
                {sensor: new AccelerometerYSensor(), uiState: UI_SENSOR_SELECT_STATE.ACCELERATION, threshold: 0.25}, 
                {sensor: new AccelerometerZSensor(), uiState: UI_SENSOR_SELECT_STATE.ACCELERATION, threshold: 0.25},
                {sensor: new LightSensor(),          uiState: UI_SENSOR_SELECT_STATE.LIGHT,        threshold: 0.75},
                {sensor: new MagnetSensor(),        uiState: UI_SENSOR_SELECT_STATE.MAGNET,       threshold: 0.80},
            ];

            // Don't trigger the same sensor selection twice in a row:
            let ignore: boolean[] = dynamicInfo.map(_ => false);
            control.inBackground(() => {
                while (this.uiMode == UI_MODE.SENSOR_SELECTION) {
                    dynamicInfo.forEach((info, idx) => {
                        if (!ignore[idx] && info.sensor.getNormalisedReading() > info.threshold) {
                            this.uiSensorSelectState = info.uiState;

                            ignore = dynamicInfo.map(_ => false);
                            ignore[idx] = true;
                            basic.pause(1000)
                        }
                        basic.pause(100)
                    })
                    basic.pause(100)
                }
                return;
            })
        }


        //-------------------------
        // Special Waiting Methods:
        //-------------------------

        /**
         * Wait time number of milliseconds but in increments of check_n_times. Exit if initialState changes.
         * To show led animations you need to wait inbetween each frame. But you need to switch to another state if a button is pressed immediately.
         * used by .showSensorIcon()
         * 
         * @param time milliseconds
         * @param check_n_times period = time / check_n_times
         * @param initialState this.uiSensorSelectState != causes pre-mature exit; returning false.
         * @returns true if neither this.uiSensorSelectState nor this.uiMode changed; meaning that the full time was waited.
         */
        private waitUntilSensorSelectStateChange(time: number, check_n_times: number, initialState: UI_SENSOR_SELECT_STATE): boolean {
            const period = time / check_n_times;

            for (let n = 0; n < check_n_times; n++) {
                if (this.uiSensorSelectState != initialState || this.uiMode != UI_MODE.SENSOR_SELECTION)
                    return false;

                basic.pause(period)
            }
            return true;
        }

        /**
         * Wait time number of milliseconds but in increments of check_n_times. Exit if initialState changes.
         * To show led animations you need to wait inbetween each frame. But you need to switch to another state if a button is pressed immediately.
         * used by .log()
         * 
         * @param time milliseconds
         * @param check_n_times period = time / check_n_times
         * @param initialState this.uiMode != causes pre-mature exit; returning false.
         * @returns true if this.uiMode did not change; meaning that the full time was waited.
         */
        private waitUntilUIModeChanges(time: number, check_n_times: number, initialState: UI_MODE): boolean {
            const period = time / check_n_times;

            for (let n = 0; n < check_n_times; n++) {
                if (this.uiMode != initialState) {
                    return false;
                }
                basic.pause(period)
            }
            return true;
        }


        //-----------------
        // Display Methods:
        //-----------------


        /**
         * Starts a fiber that loops through UI_SENSOR_SELECT_STATE:
         *      Showing each as an animation, checking for this.uiMode & this.uiSensorSelectState changes whilst waiting.
         * Invoked at start & by the B button if re-entering SENSOR_SELECTION UI_MODE from the LOGGING UI_MODE
         */
        private showSensorIcon() {
            control.inBackground(() => {
                while (this.uiMode == UI_MODE.SENSOR_SELECTION) {
                    switch (this.uiSensorSelectState) {
                        case UI_SENSOR_SELECT_STATE.ACCELERATION: {
                            // basic.showLeds() requires a '' literal; thus the following is un-loopable: 

                            basic.showLeds(`
                                # # # . .
                                # # . . .
                                # . # . .
                                . . . # .
                                . . . . .
                            `);
                            if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS / 3), 10, UI_SENSOR_SELECT_STATE.ACCELERATION)) break;

                            basic.showLeds(`
                                . . # . .
                                . . # . .
                                # # # # #
                                . # # # .
                                . . # . .
                            `);
                            if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS / 3), 10, UI_SENSOR_SELECT_STATE.ACCELERATION)) break;

                            basic.showLeds(`
                                . . # . .
                                . . # # .
                                # # # # #
                                . . # # .
                                . . # . .
                            `);
                            if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS / 3), 10, UI_SENSOR_SELECT_STATE.ACCELERATION)) break;

                            break;
                        }
                            
                        case UI_SENSOR_SELECT_STATE.TEMPERATURE: {
                            basic.showLeds(`
                                # . . . .
                                . . # # .
                                . # . . .
                                . # . . .
                                . . # # .
                            `);
                            if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS), 50, UI_SENSOR_SELECT_STATE.TEMPERATURE)) break;

                            break;
                        }

                        case UI_SENSOR_SELECT_STATE.LIGHT: {
                            basic.showLeds(`
                                . . . . .
                                . # # # .
                                . . # . .
                                . . . . .
                                . . # . .
                            `);
                            if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS>> 1), 50, UI_SENSOR_SELECT_STATE.LIGHT)) break;
                            
                            basic.showLeds(`
                                . # # # .
                                . # # # .
                                . # # # .
                                . . . . .
                                . . # . .
                            `);
                            if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS>> 1), 50, UI_SENSOR_SELECT_STATE.LIGHT)) break;

                            break;
                        }

                        case UI_SENSOR_SELECT_STATE.MAGNET: {
                            basic.showLeds(`
                                . # # # .
                                # # # # #
                                # # . # #
                                . . . . .
                                . . . . .
                            `)
                            if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS>> 1), 50, UI_SENSOR_SELECT_STATE.MAGNET)) break;

                            basic.showLeds(`
                                . # # # .
                                # # # # #
                                # # . # #
                                . . . . .
                                # # . # #
                            `)
                            if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS>> 1), 50, UI_SENSOR_SELECT_STATE.MAGNET)) break;

                            break;
                        }

                        case UI_SENSOR_SELECT_STATE.RADIO: {
                            basic.showLeds(`
                                . . . . .
                                . . . . .
                                . # # # .
                                # . . . #
                                . . # . . 
                            `);
                            if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS>> 1), 50, UI_SENSOR_SELECT_STATE.RADIO)) break;
                            
                            basic.showLeds(`
                                . # # # .
                                # . . . #
                                . # # # .
                                # . . . #
                                . . # . .
                            `);
                            if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS>> 1), 50, UI_SENSOR_SELECT_STATE.RADIO)) break;

                            break;
                        }

                        default:
                            break;
                    }
                }
            });
        }

        
        /**
         * Get the sensor(s) that the user selected and start logging them.
         * Exit if the UI_MODE changes back to SENSOR_SELECTION (upon the user pressing B)
         */
        private log() {
            const sensors = this.uiSelectionToSensors();
            let time = 0;

            control.inBackground(() => {
                while (this.uiMode == UI_MODE.LOGGING) {
                    let start = input.runningTime();
                    sensors.forEach(sensor => {
                        datalogger.log(
                            datalogger.createCV("Sensor", sensor.getName()),
                            datalogger.createCV("Time (ms)", time),
                            datalogger.createCV("Reading", sensor.getReading()),
                            datalogger.createCV("Event", "N/A")
                        );
                    });

                    if (this.uiMode == UI_MODE.LOGGING)
                        basic.showNumber((time / 1000));
                    if (!this.waitUntilUIModeChanges(Math.max(0, 1000 - (input.runningTime() - start)), 80, UI_MODE.LOGGING)) break;
                    time += 1000;
                }
                return;
            });
        }


        /**
         * this.uiSensorSelectState -> relevant sensors
         * Most are only 1 sensor, but UI_SENSOR_SELECT_STATE.ACCELERATION gives all X,Y,Z sensors.
         * 
         * Special note to UI_SENSOR_SELECT_STATE.RADIO which leaves NoArcadeShieldMode & starts the DistributedLoggingProtocol().
         * 
         * @returns sensors used by .log()
         */
        private uiSelectionToSensors(): Sensor[] {
            switch (this.uiSensorSelectState) {
                case UI_SENSOR_SELECT_STATE.ACCELERATION:
                    return [new AccelerometerXSensor(), new AccelerometerYSensor(), new AccelerometerZSensor()]

                case UI_SENSOR_SELECT_STATE.TEMPERATURE:
                    return [new TemperatureSensor()]

                case UI_SENSOR_SELECT_STATE.LIGHT:
                    return [new LightSensor()]

                case UI_SENSOR_SELECT_STATE.MAGNET:
                    return [new MagnetSensor()]

                case UI_SENSOR_SELECT_STATE.RADIO:
                    new DistributedLoggingProtocol(this.app, false);
                    return []
            
                default:
                    return []
            }
        }
    }
}