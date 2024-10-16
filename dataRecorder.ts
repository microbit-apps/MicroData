namespace microdata {
    import Screen = user_interface_base.Screen
    import Scene  = user_interface_base.Scene

    /** Number of sensor information boxes that can fit onto the screen at once*/
    const MAX_SENSORS_ON_SCREEN: number = 5
    /** The colours that will be used for the lines & sensor information boxes */
    const SENSOR_BOX_COLORS: number[] = [2,3,4,6,7,9]
    /** The colours that will be used for writing the information about the sensor. */
    const SENSOR_BOX_TEXT_COLORS: number[] = [1,1,1,1,15,15]

    /**
     * Responsible for invoking the logging commands for each sensor,
     * Presents information about each sensor's state via colourful collapsing boxes
     * 
     * Sensors are logged via a scheduler
     */
    export class DataRecorder extends Scene {
        /**  */
        private scheduler: SensorScheduler;
        /** For displaying their status on the screen and passing to the scheduler. */
        private sensors: Sensor[]
        /** For faster looping, modulo calculation when pressing UP or DOWN */
        private numberOfSensors: number;
        /** Sensor to be shown */
        private currentSensorIndex: number;
        /** Last sensor on the screen */
        private sensorIndexOffset: number;
        /** For the currentSensorIndex */
        private sensorBoxColor: number;

        constructor(private app: App, sensors: Sensor[]) {
            super("dataRecorder")

            this.scheduler = new SensorScheduler(sensors)
            this.sensors = sensors
            this.numberOfSensors = sensors.length

            this.sensorIndexOffset = 0 
            this.currentSensorIndex = 0
            this.sensorBoxColor = 15

            //---------------
            // User Controls:
            //---------------

            // Go Back:
            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.B.id,
                () => {
                    this.app.popScene()
                    this.app.pushScene(new Home(this.app))
                }
            )

            // Clear whatever A was previously bound to
            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.A.id,
                () => {}
            )

            // Scroll Up
            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.up.id,
                () => {
                    this.currentSensorIndex = Math.max(0, this.currentSensorIndex - 1)

                    if (this.sensorIndexOffset > 0)
                        this.sensorIndexOffset = Math.max(0, this.sensorIndexOffset - 1)
                    
                    this.update()
                }
            )

            // Scroll Down
            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.down.id,
                () => {
                    this.currentSensorIndex = Math.min(this.currentSensorIndex + 1, this.numberOfSensors - 1)

                    if (this.currentSensorIndex > 4)
                        this.sensorIndexOffset = Math.min(this.sensorIndexOffset + 1, this.numberOfSensors - 5)

                    this.update()
                }
            )

            this.log()
        }
 
        log() {this.scheduler.start()}

        update(): void {
            Screen.fillRect(
                Screen.LEFT_EDGE,
                Screen.TOP_EDGE,
                Screen.WIDTH,
                Screen.HEIGHT,
                0xc
            )

            // Check if all sensors have finished their work:
            if (this.scheduler.loggingComplete()) {
                screen().printCenter("Data Logging Complete.", (screen().height / 2) - 10);
                screen().printCenter("Press B to back out.", screen().height / 2);
            }

            else {
                screen().printCenter("Recording data...", 4);
                let y = 16

                for (let i = this.sensorIndexOffset; i < this.numberOfSensors; i++) {
                    if (i - this.sensorIndexOffset > MAX_SENSORS_ON_SCREEN)
                        break
                    
                    // Get the colour for this box
                    this.sensorBoxColor = SENSOR_BOX_COLORS[i % SENSOR_BOX_COLORS.length]

                    const boxWidth: number = 142

                    // Draw box as collapsed:
                    if (i != this.currentSensorIndex) {
                        screen().fillRect(
                            5,
                            y,
                            boxWidth,
                            16,
                            16
                        )
                        
                        screen().fillRect(
                            7,
                            y,
                            boxWidth + 3,
                            14,
                            this.sensorBoxColor
                        )

                        screen().print(
                            this.sensors[i].getName(),
                            12,
                            y + 2,
                            15
                        )
                    }

                    // Box is selected: Draw all information:
                    else {
                        screen().fillRect(
                            5,
                            y,
                            boxWidth,
                            62,
                            15
                        )

                        screen().fillRect(
                            7,
                            y,
                            boxWidth + 3,
                            60,
                            this.sensorBoxColor
                        )

                        //-------------------------------
                        // Information inside sensor box:
                        //-------------------------------

                        const sensor = this.sensors[i]
                        screen().print(
                            sensor.getName(),
                            12,
                            y + 2,
                            15
                        )

                        //------------------------------
                        // Write the sensor information:
                        //------------------------------
                        const sensorInfo: string[] = (sensor.isInEventMode) ? sensor.getEventInformation() : sensor.getRecordingInformation();
                        sensorInfo.forEach((info, idx) => {
                            y += 12
                            screen().print(
                                info,
                                24,
                                y,
                                SENSOR_BOX_TEXT_COLORS[idx]
                            )
                        });
                    }

                    y += 14
                }
            }
        }
    }
}