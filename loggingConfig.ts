namespace microdata {
    import Screen = user_interface_base.Screen
    import Scene = user_interface_base.Scene
    import CursorSceneEnum = user_interface_base.CursorSceneEnum
    import AppInterface = user_interface_base.AppInterface
    import font = user_interface_base.font

    /**
     * Generated at recordingConfigSelection 
     * Passed to and owned by a sensor
     * The sensor uses this information to control how it logs readings
     */
    export type RecordingConfig = {
        measurements: number,
        period: number
        inequality?: string,
        comparator?: number
    };

    /**
     * Turn a RecordingConfig into a string that can be prepended with the shorthand for a sensor's name (see SensorFactory.getFromRadioName()),
     * This string can then be sent over the radio (see radioLoggingProtocol) by a Commander, a Target can then turn this string back into a Sensor and configure it.
     * @param config Either Period or Event measurement
     * @returns A string that can be prepended with a sensor shorthand (e.g: L + "," + serializeRecordingConfig()): meaning a Light sensor should have this RecordingConfig
     */
    export function serializeRecordingConfig(config: RecordingConfig): string {
        if (config == null)
            return ""

        if (config.inequality == null || config.comparator == null)
            return "P," + config.measurements + "," + config.period

        return "E," + config.measurements + "," + config.inequality + "," + config.comparator
    }
    
    const enum GUI_STATE {
        SENSOR_SELECT,
        SENSOR_SELECT_CONFIG_ROW,
        SENSOR_MODIFY_CONFIG_ROW
    }

    const enum CONFIG_ROW {
        MEASUREMENT_QTY = 0,
        PERIOD_OR_EVENT = 1,
        DONE = 2
    }

    const enum CONFIG_MODE {
        PERIOD,
        EVENT
    }

    const CONFIG_ROW_DISPLAY_NAME_LOOKUP = [
        "Measurements", // MEASUREMENT_QTY
        "Period   Event", // PERIOD_OR_EVENT; Add space to account for the line that separates them when drawn - this is drawn as a switch.
        "Done" // DONE
    ]
    
    const GUI_TEXT_EVENT_CONFIG = ["choose inequality", "compared against"]
    const enum GUI_TEXT_EVENT_INDEX {
        INEQUALITY,
        COMPARATOR
    }

    const GUI_TEXT_PERIOD_CONFIG = ["number of milliseconds", "number of seconds", "number of minutes", "number of hours", "number of days"]
    const GUI_PERIOD_DEFAULTS = [0, 1, 0, 0, 0] // ms, Seconds, Minutes, Hours, Days

    /**
     * The (ms, second, minute, hour, day) ui elements kept in RecordingSettingsGUIColumn.value are converted into ms using this:
     */
    const TIME_CONVERSION_TABLE: number[] = [1, 1000, 60000, 3600000, 86400000]

    /**
     * Responsible for allowing the user to select the specific recording configurations for each passed sensor.
     * The user may also choose to select an event for each sensor.
     * 
     * After submission the DataRecorder is loaded & these sensor configs excercised.
     */
    export class RecordingConfigSelection extends Scene {
        private guiState: GUI_STATE;

        private sensors: Sensor[];
        private sensorConfigs: RecordingConfig[]

        private sensorIndex: number;
        private configurationIndex: CONFIG_ROW;
        private eventOrPeriodIndex: number
        private guiConfigValues: number[][]

        private currentConfigMode: CONFIG_MODE
        private sensorConfigIsSet: boolean[]

        private nextSceneEnum: CursorSceneEnum

        constructor(private app: AppInterface, sensors: Sensor[], nextSceneEnum?: CursorSceneEnum) {
            super("measurementConfigSelect")
            this.guiState = GUI_STATE.SENSOR_SELECT

            this.sensors = sensors
            this.sensorConfigs = []
            this.guiConfigValues = []

            this.sensorIndex = 0
            this.configurationIndex = CONFIG_ROW.MEASUREMENT_QTY
            this.eventOrPeriodIndex = 0
            this.currentConfigMode = CONFIG_MODE.PERIOD
            this.sensorConfigIsSet = []

            this.nextSceneEnum = nextSceneEnum

            for (let i = 0; i < this.sensors.length; i++) {
                this.sensorConfigIsSet.push(false)
                this.sensorConfigs.push({measurements: 10, period: 1000, inequality: null, comparator: null}) // Defaults per sensor

                this.guiConfigValues[i] = GUI_PERIOD_DEFAULTS
            }
        }

        /* override */ startup() {
            super.startup()

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.A.id,
                () => {
                    switch (this.guiState) {
                        case GUI_STATE.SENSOR_SELECT: {
                            this.guiState = GUI_STATE.SENSOR_SELECT_CONFIG_ROW;
                            this.update();
                            break;
                        }

                        case GUI_STATE.SENSOR_SELECT_CONFIG_ROW: {
                            // User selects DONE:
                            if (this.configurationIndex == CONFIG_ROW.DONE) {
                                this.sensorConfigIsSet[this.sensorIndex] = true

                                for (let i = 0; i < this.sensors.length; i++) {
                                    if (!this.sensorConfigIsSet[i]) {
                                        // Reset GUI state:
                                        this.configurationIndex = CONFIG_ROW.MEASUREMENT_QTY 
                                        this.eventOrPeriodIndex = 0        
                                        this.guiState = GUI_STATE.SENSOR_SELECT 
                                        return
                                    }
                                }
                                
                                this.app.popScene()

                                if (this.nextSceneEnum == CursorSceneEnum.DistributedLogging) {
                                    this.app.pushScene(new DistributedLoggingScreen(this.sensors, this.sensorConfigs));
                                }
                                else {
                                    // All sensors are configured, pass them their config and move to the DataRecording screen:
                                    this.sensors.map((sensor, index) => {
                                        sensor.setConfig(this.sensorConfigs[index])
                                    });

                                    this.app.pushScene(new DataRecorder(this.app, this.sensors));
                                }
                            }

                            else if (this.currentConfigMode == CONFIG_MODE.EVENT && this.sensorConfigs[this.sensorIndex].inequality == null) {
                                this.eventOrPeriodIndex = 0

                                this.sensorConfigs[this.sensorIndex].period = SENSOR_EVENT_POLLING_PERIOD_MS
                                this.guiConfigValues[this.sensorIndex] = [0, Math.abs(this.sensors[this.sensorIndex].getMaximum()) - Math.abs(this.sensors[this.sensorIndex].getMinimum())]
                            }

                            else if (this.currentConfigMode == CONFIG_MODE.PERIOD) {
                                this.eventOrPeriodIndex = 0

                                this.sensorConfigs[this.sensorIndex].inequality = null
                                this.sensorConfigs[this.sensorIndex].comparator = null
                                this.guiConfigValues[this.sensorIndex] = GUI_PERIOD_DEFAULTS
                            }

                            this.guiState = GUI_STATE.SENSOR_MODIFY_CONFIG_ROW
                            break;
                        }

                        case GUI_STATE.SENSOR_MODIFY_CONFIG_ROW: {
                            switch (this.configurationIndex) {
                                case CONFIG_ROW.MEASUREMENT_QTY: {
                                    this.guiState = GUI_STATE.SENSOR_SELECT_CONFIG_ROW;
                                    break;
                                }

                                case CONFIG_ROW.PERIOD_OR_EVENT: {
                                    if (this.currentConfigMode == CONFIG_MODE.PERIOD) {
                                        this.sensorConfigs[this.sensorIndex].period = 0
                                        for (let col = 0; col < TIME_CONVERSION_TABLE.length; col++)
                                            this.sensorConfigs[this.sensorIndex].period += this.guiConfigValues[this.sensorIndex][col] * TIME_CONVERSION_TABLE[col];
                                    }

                                    else if (this.currentConfigMode == CONFIG_MODE.EVENT) {
                                        this.sensorConfigs[this.sensorIndex].inequality = sensorEventSymbols[this.guiConfigValues[this.sensorIndex][GUI_TEXT_EVENT_INDEX.INEQUALITY]];
                                        this.sensorConfigs[this.sensorIndex].comparator = this.guiConfigValues[this.sensorIndex][GUI_TEXT_EVENT_INDEX.COMPARATOR];
                                        this.sensorConfigs[this.sensorIndex].period = SENSOR_EVENT_POLLING_PERIOD_MS;
                                    }
                                    this.guiState = GUI_STATE.SENSOR_SELECT_CONFIG_ROW
                                    break;
                                }              
                            }
                            break
                        }
                    }
                    this.update();
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.B.id,
                () => {
                    switch (this.guiState) {
                        case GUI_STATE.SENSOR_SELECT: {
                            this.app.popScene()
                            this.app.pushScene(new Home(this.app))
                        }

                        case GUI_STATE.SENSOR_SELECT_CONFIG_ROW: {
                            this.guiState = GUI_STATE.SENSOR_SELECT
                            this.update();
                            break;
                        }

                        case GUI_STATE.SENSOR_MODIFY_CONFIG_ROW: {
                            this.guiState = GUI_STATE.SENSOR_SELECT_CONFIG_ROW
                            this.update();
                            break;
                        }
                    }
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.up.id,
                () => {
                    if (this.guiState != GUI_STATE.SENSOR_MODIFY_CONFIG_ROW) {
                        const qty = (this.guiState == GUI_STATE.SENSOR_SELECT) ? this.sensors.length : CONFIG_ROW_DISPLAY_NAME_LOOKUP.length

                        // Non-Negative modulo support:
                        if (this.guiState == GUI_STATE.SENSOR_SELECT)
                            this.sensorIndex = (((this.sensorIndex - 1) % qty) + qty) % qty
                        else
                            this.configurationIndex = (((this.configurationIndex - 1) % qty) + qty) % qty
                    }

                    else if (this.guiState == GUI_STATE.SENSOR_MODIFY_CONFIG_ROW) {
                        switch (this.configurationIndex) {
                            case CONFIG_ROW.MEASUREMENT_QTY: {
                                this.sensorConfigs[this.sensorIndex].measurements += 10
                                break;
                            }
                            case CONFIG_ROW.PERIOD_OR_EVENT: {
                                if (this.currentConfigMode == CONFIG_MODE.EVENT) {
                                    const qty = (this.eventOrPeriodIndex == GUI_TEXT_EVENT_INDEX.INEQUALITY) ? sensorEventSymbols.length : this.sensors[this.sensorIndex].getMaximum()
                                    this.guiConfigValues[this.sensorIndex][this.eventOrPeriodIndex] = (this.guiConfigValues[this.sensorIndex][this.eventOrPeriodIndex] + 1) % qty
                                }

                                else if (this.currentConfigMode == CONFIG_MODE.PERIOD) {

                                    this.guiConfigValues[this.sensorIndex][this.eventOrPeriodIndex] += 1
                                    // basic.showNumber(this.sensorIndex)
                                    // basic.showNumber(this.eventOrPeriodIndex)
                                    // basic.showNumber(this.guiConfigValues[this.sensorIndex][this.eventOrPeriodIndex])
                                }
                                break;
                            }                       
                        }
                    }
                    this.update()
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.down.id,
                () => {
                    if (this.guiState != GUI_STATE.SENSOR_MODIFY_CONFIG_ROW) {
                        const qty = (this.guiState == GUI_STATE.SENSOR_SELECT) ? this.sensors.length : CONFIG_ROW_DISPLAY_NAME_LOOKUP.length

                        if (this.guiState == GUI_STATE.SENSOR_SELECT)
                            this.sensorIndex = (this.sensorIndex + 1) % qty
                        else
                            this.configurationIndex = (this.configurationIndex + 1) % qty
                    }

                    else if (this.guiState == GUI_STATE.SENSOR_MODIFY_CONFIG_ROW) {
                        switch (this.configurationIndex) {
                            case CONFIG_ROW.MEASUREMENT_QTY: {
                                this.sensorConfigs[this.sensorIndex].measurements = Math.max(this.sensorConfigs[this.sensorIndex].measurements - 10, 0)
                                break;
                            }
                            case CONFIG_ROW.PERIOD_OR_EVENT: {
                                if (this.currentConfigMode == CONFIG_MODE.EVENT) {
                                    if (this.eventOrPeriodIndex == GUI_TEXT_EVENT_INDEX.COMPARATOR ) {
                                        if (this.guiConfigValues[this.sensorIndex][this.eventOrPeriodIndex] - 1 < this.sensors[this.sensorIndex].getMinimum())
                                            this.guiConfigValues[this.sensorIndex][this.eventOrPeriodIndex] = this.sensors[this.sensorIndex].getMaximum()
                                        else
                                            this.guiConfigValues[this.sensorIndex][this.eventOrPeriodIndex] -= 1  
                                    }
                                    else if (this.eventOrPeriodIndex == GUI_TEXT_EVENT_INDEX.INEQUALITY) {
                                        const qty = sensorEventSymbols.length
                                        this.guiConfigValues[this.sensorIndex][this.eventOrPeriodIndex] = (((this.guiConfigValues[this.sensorIndex][this.eventOrPeriodIndex] - 1) % qty) + qty) % qty
                                    }
                                }

                                else if (this.currentConfigMode == CONFIG_MODE.PERIOD) {
                                    this.guiConfigValues[this.sensorIndex][this.eventOrPeriodIndex] = Math.max(this.guiConfigValues[this.sensorIndex][this.eventOrPeriodIndex] - 1, 0)
                                }
                                break;
                            }                       
                        }
                    }
                    this.update()
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.left.id,
                () => {
                    if (this.guiState == GUI_STATE.SENSOR_SELECT_CONFIG_ROW && this.configurationIndex == CONFIG_ROW.PERIOD_OR_EVENT)
                        this.currentConfigMode = (this.currentConfigMode == CONFIG_MODE.PERIOD) ? CONFIG_MODE.EVENT : CONFIG_MODE.PERIOD

                    else if (this.guiState == GUI_STATE.SENSOR_MODIFY_CONFIG_ROW) {
                        switch (this.configurationIndex) {
                            case CONFIG_ROW.MEASUREMENT_QTY: {
                                this.sensorConfigs[this.sensorIndex].measurements = Math.max(this.sensorConfigs[this.sensorIndex].measurements - 1, 0)
                                break;
                            }
                            case CONFIG_ROW.PERIOD_OR_EVENT: {
                                const qty = (this.currentConfigMode == CONFIG_MODE.PERIOD) ? GUI_PERIOD_DEFAULTS.length : GUI_TEXT_EVENT_CONFIG.length
                                if (this.currentConfigMode == CONFIG_MODE.PERIOD)
                                    this.eventOrPeriodIndex = (((this.eventOrPeriodIndex - 1) % qty) + qty) % qty
                                else if (this.currentConfigMode == CONFIG_MODE.EVENT)
                                    this.eventOrPeriodIndex = (((this.eventOrPeriodIndex - 1) % qty) + qty) % qty
                                break;
                            }                       
                        }
                    }
                    this.update()
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.right.id,
                () => {
                    if (this.guiState == GUI_STATE.SENSOR_SELECT_CONFIG_ROW && this.configurationIndex == CONFIG_ROW.PERIOD_OR_EVENT)
                        this.currentConfigMode = (this.currentConfigMode == CONFIG_MODE.PERIOD) ? CONFIG_MODE.EVENT : CONFIG_MODE.PERIOD;

                    if (this.guiState == GUI_STATE.SENSOR_MODIFY_CONFIG_ROW) {
                        switch (this.configurationIndex) {
                            case CONFIG_ROW.MEASUREMENT_QTY: {
                                this.sensorConfigs[this.sensorIndex].measurements += 1
                                break;
                            }
                            case CONFIG_ROW.PERIOD_OR_EVENT: {
                                if (this.currentConfigMode == CONFIG_MODE.PERIOD)
                                    this.eventOrPeriodIndex = (this.eventOrPeriodIndex + 1) % GUI_PERIOD_DEFAULTS.length
                                else if (this.currentConfigMode == CONFIG_MODE.EVENT)
                                    this.eventOrPeriodIndex = (this.eventOrPeriodIndex + 1) % GUI_TEXT_EVENT_CONFIG.length
                                break;
                            }                       
                        }
                    }
                    this.update()
                }
            )
        }
        
        update() {
            Screen.fillRect(
                Screen.LEFT_EDGE,
                Screen.TOP_EDGE,
                Screen.WIDTH,
                Screen.HEIGHT,
                0xC
            )

            if (this.guiState == GUI_STATE.SENSOR_SELECT) {
                screen().printCenter("Logging Settings", 1)
                this.drawSensorSelection()
            }
            else
                this.drawConfigurationWindow()
        }

        private drawConfigurationWindow() {
            const sensorName = this.sensors[this.sensorIndex].getName()

            screen().printCenter(sensorName, 1)

            //---------------------------------
            // 3 boxes to configure the sensor:
            //---------------------------------

            const headerX = 4
            const yStart = font.charHeight + Screen.HEIGHT * 0.055 // font.charHeight + 7

            //---------------------
            // Measurements button:
            //---------------------

            // Measurements:
            screen().fillRect(
                0,
                yStart,
                (CONFIG_ROW_DISPLAY_NAME_LOOKUP[CONFIG_ROW.MEASUREMENT_QTY].length * font.charWidth),
                font.charHeight + (Screen.HEIGHT * 0.09375), // + 12
                15
            ) // Black border

            screen().fillRect(
                0,
                yStart,
                ((CONFIG_ROW_DISPLAY_NAME_LOOKUP[CONFIG_ROW.MEASUREMENT_QTY].length + 1) * font.charWidth),
                font.charHeight + (Screen.HEIGHT * 0.07031), // + 9
                7 // green
            ) // Coloured border ontop

            screen().print(
                CONFIG_ROW_DISPLAY_NAME_LOOKUP[CONFIG_ROW.MEASUREMENT_QTY],
                headerX - 2,
                yStart + (Screen.HEIGHT * 0.023437), // + 3
                15 // black
            ) // Value


            // Bounding box in blue:
            if (this.configurationIndex == CONFIG_ROW.MEASUREMENT_QTY && this.guiState != GUI_STATE.SENSOR_MODIFY_CONFIG_ROW) {
                for (let thickness = 0; thickness < 2; thickness++) {
                    screen().drawRect(
                        0,
                        yStart + thickness - 1,
                        ((CONFIG_ROW_DISPLAY_NAME_LOOKUP[CONFIG_ROW.MEASUREMENT_QTY].length + 1) * font.charWidth) - thickness,
                        font.charHeight + (Screen.HEIGHT * 0.078) - thickness, // 10
                        6
                    ) // Highlight selected in blue
                }
            }

            //-----------------------
            // Period / Event button:
            //-----------------------

            let periodEventStart = Screen.HALF_HEIGHT
    
            // Push to just above Done if Measurements selected, if selected push to just below Measurements:
            if (this.guiState == GUI_STATE.SENSOR_MODIFY_CONFIG_ROW) {
                if (this.configurationIndex == CONFIG_ROW.MEASUREMENT_QTY)
                    periodEventStart = Screen.HEIGHT - (Screen.HEIGHT * 0.3046) // -39
                else
                    periodEventStart = yStart + font.charHeight + (Screen.HEIGHT * 0.08593) // + 11 // yStart + font.charHeight + (Screen.HEIGHT * 0.08593)
            }
            
            screen().fillRect(
                0,
                periodEventStart,
                (CONFIG_ROW_DISPLAY_NAME_LOOKUP[CONFIG_ROW.PERIOD_OR_EVENT].length * font.charWidth),
                font.charHeight + (Screen.HEIGHT * 0.09375), // + 12
                15 // black
            ) // Black border

            screen().fillRect(
                0,
                periodEventStart,
                ((CONFIG_ROW_DISPLAY_NAME_LOOKUP[CONFIG_ROW.PERIOD_OR_EVENT].length + 1) * font.charWidth) + 2,
                font.charHeight + (Screen.HEIGHT * 0.07031), // + 9
                7 // green
            ) // Coloured border ontop

            
            //-----------------------------------------------
            // Period text & block: Draw as an on/off switch:
            //-----------------------------------------------

            // Draw as an on-off switch:
            const periodBlockColour = (this.currentConfigMode == CONFIG_MODE.PERIOD) ? 7 : 1 // Green vs White
            const eventBlockColour  = (this.currentConfigMode == CONFIG_MODE.EVENT)  ? 7 : 1 // Green vs White
            const periodTextColour  = 15
            const eventTextColour   = 15

            screen().fillRect(
                0,
                periodEventStart,
                ((CONFIG_ROW_DISPLAY_NAME_LOOKUP[CONFIG_ROW.PERIOD_OR_EVENT].length + 1) * font.charWidth) + 2,
                font.charHeight + (Screen.HEIGHT * 0.07), // 9
                periodBlockColour
            ) // Coloured border ontop
            
            screen().print(
                "Period",
                headerX - 2,
                periodEventStart + (Screen.HEIGHT * 0.023) + 1, // 3
                periodTextColour
            ) // Value

            //--------------------
            // Event text & block:
            //--------------------

            // Draw coloured triangle to complete the switch:
            screen().fillTriangle(
                ("Period".length + 1) * font.charWidth,
                periodEventStart + font.charHeight + (Screen.HEIGHT * 0.063), // + 8
                ("Period".length + 2) * font.charWidth,
                periodEventStart,
                ("Period".length + 7) * font.charWidth,
                periodEventStart + font.charHeight + (Screen.HEIGHT * 0.063), // + 8
                eventBlockColour
            )

            screen().fillRect(
                ("Period".length + 2) * font.charWidth,
                periodEventStart,
                ("  Event".length * font.charWidth) + 2,
                font.charHeight + (Screen.HEIGHT * 0.07), // 9 // Screen.HEIGHT * 0.1328,  // 17,
                eventBlockColour
            ) // Coloured border ontop
            
            screen().print(
                "         Event", // Space for "Period" + "   " (3 spaces)
                headerX - 2,
                periodEventStart + (Screen.HEIGHT * 0.0234) + 1, // + 3
                eventTextColour
            ) // Value


            // Diagonal line that sepratates Period and Event text
            for (let thickness = 0; thickness < 3; thickness++)
                screen().drawLine(
                    ("Period".length + 1) * font.charWidth - 1 + thickness,
                    periodEventStart + font.charHeight + (Screen.HEIGHT * 0.07), // 9
                    ("Period".length + 2) * font.charWidth - 1 + thickness,
                    periodEventStart,
                    15 // black
                )

            // Bounding box in blue if selected:
            if (this.configurationIndex == CONFIG_ROW.PERIOD_OR_EVENT && this.guiState != GUI_STATE.SENSOR_MODIFY_CONFIG_ROW) {
                for (let thickness = 0; thickness < 2; thickness++) {
                    screen().drawRect(
                        0,
                        periodEventStart + thickness,
                        ((CONFIG_ROW_DISPLAY_NAME_LOOKUP[CONFIG_ROW.PERIOD_OR_EVENT].length + 1) * font.charWidth) + 4 - thickness,
                        (Screen.HEIGHT * 0.1406) - thickness, // 18
                        6
                    ) // Highlight selected in blue
                }
            }

            //-------------
            // Done button:
            //-------------

            screen().fillRect(
                0,
                Screen.HEIGHT - (Screen.HEIGHT * 0.1406), // -18
                CONFIG_ROW_DISPLAY_NAME_LOOKUP[CONFIG_ROW.DONE].length * font.charWidth,
                font.charHeight + (Screen.HEIGHT * 0.09375), // 12
                15
            ) // Black border

            screen().fillRect(
                0,
                Screen.HEIGHT - (Screen.HEIGHT * 0.1406), // 18
                ((CONFIG_ROW_DISPLAY_NAME_LOOKUP[CONFIG_ROW.DONE].length + 1) * font.charWidth) + 3,
                font.charHeight + (Screen.HEIGHT * 0.07031), // 9
                7 // green
            ) // Coloured border ontop

            screen().print(
                CONFIG_ROW_DISPLAY_NAME_LOOKUP[CONFIG_ROW.DONE],
                headerX - 2,
                Screen.HEIGHT - (Screen.HEIGHT * 0.11718) + 2, // -15,
                15 // black
            ) // Value

            // Bounding box in blue if selected:
            if (this.configurationIndex == CONFIG_ROW.DONE && this.guiState != GUI_STATE.SENSOR_MODIFY_CONFIG_ROW) {
                for (let thickness = 0; thickness < 2; thickness++) {
                    screen().drawRect(
                        0,
                        Screen.HEIGHT - (Screen.HEIGHT * 0.1406) + thickness, // 18
                        ((CONFIG_ROW_DISPLAY_NAME_LOOKUP[CONFIG_ROW.DONE].length + 1) * font.charWidth) + 5 - thickness,
                        (Screen.HEIGHT * 0.1406) - thickness, // 18
                        6
                    ) // Highlight selected in blue
                }
            }

            //--------------------------------------------------
            // Subwindow to modify Measurements, Period / Event:
            //--------------------------------------------------

            if (this.guiState == GUI_STATE.SENSOR_MODIFY_CONFIG_ROW)
                switch (this.configurationIndex) {
                    case CONFIG_ROW.MEASUREMENT_QTY: {
                        const yWindowStart = yStart + font.charHeight + (Screen.HEIGHT * 0.0859) // 11

                        screen().fillRect(
                            2,
                            yWindowStart,
                            Screen.WIDTH - 4,
                            (Screen.HEIGHT * 0.4218), // 54
                            15
                        ) // Black border

                        screen().fillRect(
                            3,
                            yWindowStart + (Screen.HEIGHT * 0.01562), // 2
                            Screen.WIDTH - 6,
                            (Screen.HEIGHT * 0.3906), // 50
                            6
                        ) // Blue menu

                        // Prompt text:
                        screen().printCenter(
                            "How many measurements?",
                            yWindowStart + (Screen.HEIGHT * 0.0468), // 6
                            15 // black
                        )
                        
                        const measurementsText = this.sensorConfigs[this.sensorIndex].measurements.toString()
                        screen().printCenter(
                            measurementsText,
                            yWindowStart + (Screen.HEIGHT * 0.1875), // 24
                            15 // black
                        )

                        screen().drawRect(
                            Screen.HALF_WIDTH - ((measurementsText.length * font.charWidth) / 2) - 4,
                            yWindowStart + (Screen.HEIGHT * 0.1640), // 21
                            (measurementsText.length * font.charWidth) + 8,
                            (Screen.HEIGHT * 0.1093), // 13
                            5
                        ) // Yellow bounding box

                        break;
                    }
                
                    case CONFIG_ROW.PERIOD_OR_EVENT: {
                        const yPeriodOrEventWindowStart = periodEventStart + font.charHeight 
                        
                        screen().fillRect(
                            2,
                            yPeriodOrEventWindowStart + (Screen.HEIGHT * 0.0859), // 11
                            Screen.WIDTH - 4,
                            (Screen.HEIGHT * 0.4218), // 54
                            15
                        ) // Black border

                        screen().fillRect(
                            3,
                            yPeriodOrEventWindowStart + (Screen.HEIGHT * 0.10156), // 13
                            Screen.WIDTH - 6,
                            (Screen.HEIGHT * 0.3906), // 50
                            6
                        ) // Blue menu

                        if (this.currentConfigMode == CONFIG_MODE.EVENT) {
                            // Prompt text:
                            screen().printCenter(
                                GUI_TEXT_EVENT_CONFIG[this.eventOrPeriodIndex],
                                Screen.HALF_HEIGHT - (Screen.HEIGHT * 0.039), // 3
                                15 // black
                            )

                            const sensor: Sensor = this.sensors[this.sensorIndex]
                            const inequalitySymbol: string = sensorEventSymbols[this.guiConfigValues[this.sensorIndex][0]]
                            const inequalityOperand: string = this.guiConfigValues[this.sensorIndex][1].toString()

                            const expression = sensor.getName() + " " + inequalitySymbol + " " + inequalityOperand

                            // Write Event expression:
                            screen().printCenter(
                                expression,
                                Screen.HALF_HEIGHT + (Screen.HEIGHT * 0.109375), // 14
                                15 // black
                            )

                            // Box around selected element:
                            switch (this.eventOrPeriodIndex) {
                                case 0:
                                    screen().drawRect(
                                        Screen.HALF_WIDTH - ((expression.length * font.charWidth) / 2) + ((sensor.getName().length + 1) * font.charWidth) - 4,
                                        Screen.HALF_HEIGHT + (Screen.HEIGHT * 0.09375), // 12
                                        (inequalitySymbol.length * font.charWidth) + 8,
                                        Screen.HEIGHT * 0.109, // 14
                                        5 // yellow
                                    )
                                    break;

                                case 1:
                                    screen().drawRect(
                                        Screen.HALF_WIDTH - ((expression.length * font.charWidth) / 2) + ((sensor.getName() + " " + inequalitySymbol + " ").length * font.charWidth) - 4,
                                        Screen.HALF_HEIGHT + (Screen.HEIGHT * 0.09375), // 12
                                        (inequalityOperand.length * font.charWidth) + 8,
                                        Screen.HEIGHT * 0.109, // 13
                                        5 // yellow
                                    )
                                    break;
                            
                                default:
                                    break;
                            }
                        }

                        else if (this.currentConfigMode == CONFIG_MODE.PERIOD) {
                            // Prompt text:
                            screen().printCenter(
                                GUI_TEXT_PERIOD_CONFIG[this.eventOrPeriodIndex],
                                Screen.HALF_HEIGHT - (Screen.HEIGHT * 0.023437), // 3
                                15 // black
                            )

                            let periodConfigString = ""
                            for (let col = 0; col < this.guiConfigValues[this.sensorIndex].length; col++) {
                                periodConfigString += this.guiConfigValues[this.sensorIndex][col] + ((col + 1 != this.guiConfigValues[this.sensorIndex].length) ? " + " : "")
                            }

                            let distance = 0
                            for (let col = 0; col < this.guiConfigValues[this.sensorIndex].length; col++) {
                                if (col == this.eventOrPeriodIndex) {
                                    screen().drawRect(
                                        Screen.HALF_WIDTH - ((periodConfigString.length * font.charWidth) / 2) + (distance * font.charWidth) - 4,
                                        Screen.HALF_HEIGHT + (Screen.HEIGHT * 0.0625), // 8
                                        (this.guiConfigValues[this.sensorIndex][this.eventOrPeriodIndex].toString().length * font.charWidth) + 8,
                                        (Screen.HEIGHT * 0.1171), // 15
                                        5 // yellow
                                    )
                                    break
                                }

                                distance += (this.guiConfigValues[this.sensorIndex][col].toString() + " + ").length
                            }

                            screen().printCenter(
                                periodConfigString,
                                Screen.HALF_HEIGHT + (Screen.HEIGHT * 0.09375), // 12,
                                15
                            )
                        }

                        break;
                    }
                }
        }

        private drawSensorSelection() {
            const headerX = 4
            const headerY = Screen.HEIGHT * 0.172 // 22
            const rowSize = Screen.HEIGHT / (this.sensors.length + 1)

            for (let row = 0; row < this.sensors.length; row++) {
                // Colour for the box:
                const boxColor = (this.sensorConfigIsSet[row]) ? 7 : 2 // green: set, red: unset

                screen().fillRect(
                    0,
                    headerY + (row * rowSize) - (Screen.HEIGHT * 0.023437), // 3
                    (this.sensors[row].getName().length * font.charWidth) + 4,
                    font.charHeight + (Screen.HEIGHT * 0.0703), // 9
                    15 // black
                )
    
                screen().fillRect(
                    1,
                    headerY + (row * rowSize) - (Screen.HEIGHT * 0.023437), // 3
                    (this.sensors[row].getName().length * font.charWidth) + 5,
                    font.charHeight + (Screen.HEIGHT * 0.04687), // 6
                    boxColor
                )

                // Bounding box in blue if selected:
                if (row == this.sensorIndex) {
                    for (let thickness = 0; thickness < 2; thickness++) {
                        screen().drawRect(
                            0,
                            headerY + (row * rowSize) - (Screen.HEIGHT * 0.03125) + thickness, // 4
                            (this.sensors[row].getName().length * font.charWidth) + 7 - thickness,
                            font.charHeight + (Screen.HEIGHT * 0.063) - 1, // 8
                            6
                        ) // Highlight selected in blue
                    }
                } 

                screen().print(
                    this.sensors[row].getName(),
                    headerX - 2,
                    (Screen.HEIGHT * 0.1875) + (row * rowSize) - 1, // 24
                    15 // black
                )
            }
        }
    }
}