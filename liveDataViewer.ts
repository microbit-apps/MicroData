namespace microdata {
    import Screen = user_interface_base.Screen
    import Scene = user_interface_base.Scene
    import AppInterface = user_interface_base.AppInterface
    import font = user_interface_base.font

    /** The colours that will be used for the lines & sensor information boxes */
    const SENSOR_COLORS: number[] = [2,3,4,6,7,9]

    /** Time to wait inbetween updating each frame of the graph - new sensor reading requests are made.
     * The rest of the UI is still responsive though - since UP, DOWN, LEFT, RIGHT movements will invoke .update() immediately.
     */
    const GRAPH_FRAME_TIME_MS: number = 100

    /**
     * Used in sensors.draw()
     * Neccessary to prevent graph overflowing in the case of extreme readings
     */
    export const BUFFERED_SCREEN_HEIGHT = Screen.HEIGHT - 6

    /**
     * Is the graph or the sensors being shown? Is the graph zoomed in on?
    */
    enum GUI_STATE {
        GRAPH,
        /** The sensors are being shown */
        SENSOR_SELECTION,
        /** GUI Buffers are removed, sensor read buffer is increased */
        ZOOMED_IN
    }

    /**
     * Indice access alias into this.sensorMinsAndMaxs columns.
     */
    enum MIN_MAX_COLUMNS {
        MIN = 0,
        MAX = 1
    }

    /**
     * One of the 3 main functionalities of MicroData
     * Allows for the live feed of a sensor to be plotted,
     *      Multiple sensors may be plotted at once
     *      Display modes may be toggled per sensor
     * 
     * 
     * UI elements have been scaled to allow for Arcade Shields of different dimensions.
     * Where this is the case the raw value for an Arcade Shield of Height 128 is commented alongside it.
     */
    export class LiveDataViewer extends Scene {
        /** Same as the Screen.HEIGHT. But reduced when entering GUI_STATE.ZOOMED_IN. */
        private windowWidth: number
        /** Same as the Screen.HEIGHT. But reduced when entering GUI_STATE.ZOOMED_IN. */
        private windowHeight: number
        
        /** Reduced when entering GUI_STATE.ZOOMED_IN */
        private windowLeftBuffer: number
        /** Reduced when entering GUI_STATE.ZOOMED_IN */
        private windowRightBuffer: number
        /** Reduced when entering GUI_STATE.ZOOMED_IN */
        private windowTopBuffer: number
        /** Reduced when entering GUI_STATE.ZOOMED_IN */
        private windowBotBuffer: number
        /** How much all UI elements should be offset by, adjusted when pressing up or down. */
        private yScrollOffset: number
        /** Maximum limit to how far yScrollOffset may travel, this is so the screen cannot go below the sensor information boxes */
        private maxYScrollOffset: number
        /** By how much should this.yScrollRate be adjusted by?  */
        private yScrollRate: number
        
        /** Show the graph or show the sensor information below the graph? */
        private guiState: GUI_STATE;

        //--------------------------------
        // Oscilloscope control variables:
        //--------------------------------

        /** Zoom in on X; adjust offsets to make this point centred, whilst zoomed */
        private oscXCoordinate: number
        /** Zoom in on Y; adjust offsets to make this point centred, whilst zoomed */
        private oscReading: number

        /** Which sensor is being zoomed in upon? */
        private oscSensorIndex: number

        /** That are being drawn */
        private sensors: Sensor[]
        /** Sensors can be turned on & off: only showSensors[n] == true are shown */
        private drawSensorStates: boolean[];
        /** Use the sensor minimum and maximum data to wwrite information about them below the plot */
        private sensorMinsAndMaxs: number[][];
        /** After scrolling past the plot the user can select a sensor to disable/enable */
        private informationSensorIndex: number;

        /** Lowest of sensor.minimum for all sensors: required to write at the bottom of the y-axis */
        private globalSensorMinimum: number;
        /** Greatest of sensor.maximum for all sensors: required to write at the top of the y-axis */
        private globalSensorMaximum: number;

        constructor(app: AppInterface, sensors: Sensor[]) {
            super(app, "liveDataViewer")
            this.backgroundColor = 3

            this.windowWidth = Screen.WIDTH
            this.windowHeight = Screen.HEIGHT
            
            this.windowLeftBuffer = 38
            this.windowRightBuffer = 10
            this.windowTopBuffer = (Screen.HEIGHT *  0.0390) // At Screen.HEIGHT=128: 5
            this.windowBotBuffer = (Screen.HEIGHT * 0.15625) // 20

            this.guiState = GUI_STATE.GRAPH
            
            this.yScrollOffset = 0
            this.yScrollRate = (Screen.HEIGHT * 0.15625) // 20
            this.maxYScrollOffset = (Screen.HEIGHT * -0.46875) - ((sensors.length - 1) * (Screen.HEIGHT * 0.21875)) // 60, 28

            this.oscXCoordinate = 0
            this.oscReading = 0
            this.oscSensorIndex = 0

            this.sensors = sensors
            this.drawSensorStates = []
            this.sensorMinsAndMaxs = []

            sensors.forEach((sensor) => {
                this.sensorMinsAndMaxs.push([sensor.getMinimum(), sensor.getMaximum()])
                this.drawSensorStates.push(true)
            })
            this.setGlobalMinAndMax()
        }


        /* override */ startup() {
            super.startup()

            //--------------------------------
            // Oscilloscope Movement Controls:
            //--------------------------------

            // Zoom in:
            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.A.id,
                () => {
                    if (this.guiState == GUI_STATE.SENSOR_SELECTION) {
                        this.drawSensorStates[this.informationSensorIndex] = !this.drawSensorStates[this.informationSensorIndex];
                        this.setGlobalMinAndMax(); // Re-calculate
                    }
                    else {
                        this.guiState = GUI_STATE.ZOOMED_IN;
                        this.sensors.forEach((sensor) => sensor.setBufferSize(140));

                        const sensor = this.sensors[this.oscSensorIndex];
                        this.oscXCoordinate = Math.round(sensor.getHeightNormalisedBufferLength()>> 1);
                        this.oscReading = sensor.getNthHeightNormalisedReading(this.oscXCoordinate);
;
                        this.windowLeftBuffer = 0;
                        this.windowRightBuffer = 0;
                        this.windowTopBuffer = 0;
                        this.windowBotBuffer = 0;

                        this.update();
                    }
                }
            )

            // Zoom out, if not ZOOMED_IN then go back to home
            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.B.id,
                () => {
                    if (this.guiState != GUI_STATE.ZOOMED_IN) {
                        this.app.popScene()
                        this.app.pushScene(new Home(this.app))
                    }
                    
                    else {
                        this.guiState = GUI_STATE.GRAPH
                        this.sensors.forEach((sensor) => sensor.setBufferSize(80))

                        this.windowHeight = Screen.HEIGHT
                        this.windowWidth = Screen.WIDTH

                        this.windowLeftBuffer = 38
                        this.windowRightBuffer = 10
                        this.windowTopBuffer = (Screen.HEIGHT *  0.0390) // 5
                        this.windowBotBuffer = (Screen.HEIGHT * 0.15625) // 20

                        this.update()
                    }
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.up.id,
                () => {
                    if (this.guiState != GUI_STATE.ZOOMED_IN) {
                        this.yScrollOffset = Math.min(this.yScrollOffset + this.yScrollRate, 0)
                        if (this.yScrollOffset <= (Screen.HEIGHT * -0.46875)) { //-60
                            this.guiState = GUI_STATE.SENSOR_SELECTION
                            this.informationSensorIndex = Math.abs(this.yScrollOffset + (Screen.HEIGHT * 0.46875)) / this.yScrollRate // 60
                            this.yScrollRate = (Screen.HEIGHT * 0.21875)
                        }
                        else {
                            this.guiState = GUI_STATE.GRAPH
                            this.yScrollRate = (Screen.HEIGHT * 0.15625) // 20
                        }
                    }

                    else if (this.guiState == GUI_STATE.ZOOMED_IN) {
                        this.oscSensorIndex = Math.max(0, this.oscSensorIndex - 1)
                        this.oscReading = this.sensors[this.oscSensorIndex].getNthHeightNormalisedReading(this.oscXCoordinate)
                    }

                    this.sensors.forEach((sensor) => sensor.normaliseDataBuffer(this.windowBotBuffer - (2 * this.yScrollOffset) + (Screen.HEIGHT * 0.0625))) // 8
                    this.update() // For fast response to the above change
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.down.id,
                () => {
                    if (this.guiState != GUI_STATE.ZOOMED_IN) {
                        this.yScrollOffset = Math.max(this.yScrollOffset - this.yScrollRate, this.maxYScrollOffset)
                        if (this.yScrollOffset <= (Screen.HEIGHT * -0.46875)) { // -60
                            this.guiState = GUI_STATE.SENSOR_SELECTION 
                            this.informationSensorIndex = Math.abs(this.yScrollOffset + (Screen.HEIGHT * 0.46875)) / this.yScrollRate // 60
                            this.yScrollRate = (Screen.HEIGHT * 0.21875) // 28
                        }
                        else {
                            this.guiState = GUI_STATE.GRAPH
                            this.yScrollRate = (Screen.HEIGHT * 0.15625) // 20   
                        }

                        this.sensors.forEach((sensor) => sensor.normaliseDataBuffer(this.windowBotBuffer - (2 * this.yScrollOffset) + (Screen.HEIGHT * 0.0625))) // 8
                        this.update() // For fast response to the above change
                    }

                    else if (this.guiState == GUI_STATE.ZOOMED_IN) {
                        this.oscSensorIndex = Math.min(this.oscSensorIndex + 1, this.sensors.length - 1)
                        this.oscReading = this.sensors[this.oscSensorIndex].getNthHeightNormalisedReading(this.oscXCoordinate)
                    }
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.left.id,
                () => {
                    if (this.guiState == GUI_STATE.ZOOMED_IN) {
                        // this.oscXCoordinate -= 1
                        // this.oscReading = this.sensors[this.oscSensorIndex].getNthHeightNormalisedReading(this.oscXCoordinate)
                        // this.update() // For fast response to the above change

                        let tick = true;
                        control.onEvent(
                            ControllerButtonEvent.Released,
                            controller.left.id,
                            () => tick = false
                        )

                        let isFirstTick = true
                        while (tick && this.oscXCoordinate > 0) {
                            this.oscXCoordinate -= 1
                            this.oscReading = this.sensors[this.oscSensorIndex].getNthHeightNormalisedReading(this.oscXCoordinate)
                            basic.pause(isFirstTick ? 100 : 33)
                            isFirstTick = false
                        }
                        control.onEvent(ControllerButtonEvent.Released, controller.left.id, () => { })
                    }
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.right.id,
                () => {
                    if (this.guiState == GUI_STATE.ZOOMED_IN) {
                        let tick = true;
                        control.onEvent(
                            ControllerButtonEvent.Released,
                            controller.right.id,
                            () => tick = false
                        )
                        let isFirstTick = true
                        while (tick && this.oscXCoordinate < this.sensors[this.oscSensorIndex].getHeightNormalisedBufferLength() - 1) {
                            this.oscXCoordinate += 1
                            this.oscReading = this.sensors[this.oscSensorIndex].getNthHeightNormalisedReading(this.oscXCoordinate)
                            basic.pause(isFirstTick ? 100 : 33)
                            isFirstTick = false
                        }
                        control.onEvent(ControllerButtonEvent.Released, controller.right.id, () => { })
                    }
                }
            )
        }

        /**
         * Looks through the current active sensors and finds the lowest minimum & highest maximum among them.
         * Sets: this.globalSensorMinimum & this.globalSensorMaximum.
         * Re-invoked upon disabling a sensor.
         * These two variables will then be displayed at the bot & top of the y-axis.
         */
        private setGlobalMinAndMax(): void {
            this.globalSensorMinimum = null
            this.globalSensorMaximum = null
            
            // Get the minimum and maximum sensor readings:
            for (let i = 0; i < this.sensors.length; i++) {
                if (this.drawSensorStates[i]) {
                    // Minimum and Maximum sensor readings for the y-axis markers
                    const sensor: Sensor = this.sensors[i]
                    if (sensor.getMinimum() < this.globalSensorMinimum || this.globalSensorMinimum == null) {
                        this.globalSensorMinimum = sensor.getMinimum()
                    }

                    if (sensor.getMaximum() > this.globalSensorMaximum || this.globalSensorMaximum == null) {
                        this.globalSensorMaximum = sensor.getMaximum()
                    }
                }
            }
        }

        /**
         * Request each sensor updates its buffers,
         * Then draw to screen
         */
        update() {
            screen().fill(this.backgroundColor);

            // Make graph region black:
            screen().fillRect(
                this.windowLeftBuffer,
                this.windowTopBuffer + this.yScrollOffset + this.yScrollOffset, 
                Screen.WIDTH - this.windowLeftBuffer - this.windowRightBuffer,
                this.windowHeight - this.windowBotBuffer - ((this.guiState == GUI_STATE.ZOOMED_IN) ? 0 : 4),
                15
            );

            //-------------------------------
            // Load the buffer with new data:
            //-------------------------------

            if (this.guiState != GUI_STATE.SENSOR_SELECTION) {
                for (let i = 0; i < this.sensors.length; i++) {
                    if (this.drawSensorStates[i]) {
                        const hasSpace = this.sensors[i].getBufferLength() < this.sensors[i].getMaxBufferSize()
                        if ((this.guiState != GUI_STATE.ZOOMED_IN) || (this.guiState == GUI_STATE.ZOOMED_IN && hasSpace))
                            this.sensors[i].readIntoBufferOnce(this.windowBotBuffer - (2 * this.yScrollOffset) + 2) // 8
                    }
                        
                }
            }

            //----------------------------
            // Draw sensor lines & ticker:
            //----------------------------
            if (this.guiState != GUI_STATE.SENSOR_SELECTION) {
                let tickerYValues: number[] = []
                for (let i = 0; i < this.sensors.length; i++) {
                    if (this.drawSensorStates[i]) {
                        const sensor = this.sensors[i]
                        const color: number = SENSOR_COLORS[i % SENSOR_COLORS.length]

                        // Draw lines:
                        sensor.draw(
                            this.windowLeftBuffer + 2,
                            color
                        )

                        // Draw the latest reading on the right-hand side as a Ticker if at no-zoom:
                        if (this.guiState != GUI_STATE.ZOOMED_IN && sensor.getHeightNormalisedBufferLength() > 0) {
                            const fromY = this.windowBotBuffer - ( 2 * this.yScrollOffset) + 3

                            const reading = sensor.getReading()
                            const range = Math.abs(sensor.getMinimum()) + sensor.getMaximum()
                            const y = Math.round(Screen.HEIGHT - ((((reading - sensor.getMinimum()) / range) * (BUFFERED_SCREEN_HEIGHT - fromY)))) - fromY

                            // Make sure the ticker won't be cut-off by other UI elements
                            if (!tickerYValues.some(v => Math.abs(v - y) <= 5)) {
                                screen().print(
                                    sensor.getNthReading(sensor.getBufferLength() - 1).toString().slice(0, 4),
                                    this.windowLeftBuffer + sensor.getBufferLength() + 4,
                                    y - 1,
                                    color,
                                    bitmaps.font5,
                                )
                            }

                            tickerYValues.push(y)
                        }
                    }
                }
            }

            //--------------------------
            // Draw oscilloscope circle:
            //--------------------------
            if (this.guiState == GUI_STATE.ZOOMED_IN && this.oscReading != undefined) {
                screen().drawCircle(
                    this.windowLeftBuffer + this.oscXCoordinate + 2,
                    this.oscReading,
                    5,
                    1
                );

                //----------------------------------------------------------
                // Write x & y values of the current sensor in the top left:
                //----------------------------------------------------------

                const xText = "x = " + this.oscXCoordinate
                const yText = "y = " + this.oscReading
                screen().print(
                    xText,
                    this.windowWidth - (1 + xText.length * font.charWidth),
                    this.windowTopBuffer + (Screen.HEIGHT * 0.0390), // 5
                    1,
                    bitmaps.font5,
                );

                screen().print(
                    yText,
                    this.windowWidth - (1 + yText.length * font.charWidth),
                    this.windowTopBuffer + (Screen.HEIGHT * 0.1172), // 15
                    1,
                    bitmaps.font5,
                );
            }

            //---------------------------------
            // Draw the axis and their markers:
            //---------------------------------
            this.draw_axes();

            //--------------------------------
            // Draw sensor information blocks:
            //--------------------------------
            if (this.yScrollOffset <= (Screen.HEIGHT * 0.3125) && this.guiState != GUI_STATE.ZOOMED_IN) { // 40
                let y = this.windowHeight - 2 + (2 * this.yScrollOffset)
                for (let i = 0; i < this.sensors.length; i++) {
                    // Black edges:
                    screen().fillRect(
                        5,
                        y,
                        142,
                        (Screen.HEIGHT * 0.3671), // 47
                        15
                    )

                    // Sensor is disabled:
                    let blockColor: number = SENSOR_COLORS[i % SENSOR_COLORS.length]
                    let textColor: number = 15; // black
                    if (!this.drawSensorStates[i]) {
                        blockColor = 15; // black
                        textColor = 1;   // white
                    }

                    // Coloured block:
                    screen().fillRect(
                        7,
                        y,
                        145,
                        (Screen.HEIGHT * 0.3515), // 45
                        blockColor
                    )

                    // Blue outline for selected sensor:
                    if (this.guiState == GUI_STATE.SENSOR_SELECTION && i == this.informationSensorIndex) {
                        // Blue edges:
                        for (let thickness = 0; thickness < 3; thickness++) {
                            screen().drawRect(
                                7 - thickness,
                                y - thickness,
                                145 + thickness,
                                (Screen.HEIGHT * 0.3515) + thickness, // 45
                                6
                            )
                        }
                    }

                    // Information:
                    screen().print(
                        this.sensors[i].getName(),
                        12,
                        y + (Screen.HEIGHT * 0.0156),// 2
                        textColor
                    )

                    screen().print(
                        "Sensor Minimum: " + this.sensorMinsAndMaxs[i][MIN_MAX_COLUMNS.MIN],
                        12,
                        y + (Screen.HEIGHT * 0.125),// 16
                        textColor
                    )

                    screen().print(
                        "Sensor Maximum: " + this.sensorMinsAndMaxs[i][MIN_MAX_COLUMNS.MAX],
                        12,
                        y + (Screen.HEIGHT * 0.25),// 32
                        textColor
                    )

                    y += (Screen.HEIGHT * 0.4296) // 55
                }
            }
            basic.pause(GRAPH_FRAME_TIME_MS);
        }


        /**
         * Draw x & y axis double-thickness each, in yellow
         * Draw abscissa and ordinate
         */
        draw_axes() {
            //------
            // Axes:
            //------
            const yAxisOffset = ((this.guiState == GUI_STATE.ZOOMED_IN) ? 2 : 0)
            for (let i = 0; i < 2; i++) {
                // X-Axis:
                screen().drawLine(
                    this.windowLeftBuffer,
                    this.windowHeight - this.windowBotBuffer + i + this.yScrollOffset + this.yScrollOffset - yAxisOffset, 
                    this.windowWidth - this.windowRightBuffer, 
                    this.windowHeight - this.windowBotBuffer + i + this.yScrollOffset + this.yScrollOffset - yAxisOffset, 
                    5
                );
                // Y-Axis:
                screen().drawLine(
                    this.windowLeftBuffer + i, 
                    this.windowTopBuffer + this.yScrollOffset + this.yScrollOffset, 
                    this.windowLeftBuffer + i, 
                    this.windowHeight - this.windowBotBuffer + this.yScrollOffset + this.yScrollOffset, 
                    5
                );
            }

            if (this.guiState != GUI_STATE.ZOOMED_IN) {
                //----------
                // Ordinate:
                //----------
                if (this.yScrollOffset > (Screen.HEIGHT * -0.46875)) { // -60
                    if (this.globalSensorMinimum != null && this.globalSensorMaximum != null) {
                        // Bot:
                        screen().print(
                            this.globalSensorMinimum.toString(),
                            (6 * font.charWidth) - (this.globalSensorMinimum.toString().length * font.charWidth),
                            this.windowHeight - this.windowBotBuffer + this.yScrollOffset + this.yScrollOffset - (Screen.HEIGHT * 0.03125), // 4 
                            15
                        )

                        // Top:
                        screen().print(
                            this.globalSensorMaximum.toString(),
                            (6 * font.charWidth) - (this.globalSensorMaximum.toString().length * font.charWidth),
                            Screen.HEIGHT - this.windowHeight + this.windowTopBuffer - Math.floor(0.1 * this.yScrollOffset),
                            15
                        )
                    }
                }

                //----------
                // Abscissa:
                //----------

                // Start
                screen().print(
                    this.sensors[0].numberOfReadings.toString(),
                    this.windowLeftBuffer - 2,
                    this.windowHeight - this.windowBotBuffer + this.yScrollOffset + this.yScrollOffset + (Screen.HEIGHT * 0.03125), // 4
                    15
                )

                // End:
                const end: string = (this.sensors[0].numberOfReadings + this.sensors[0].getHeightNormalisedBufferLength()).toString() 
                screen().print(
                    end,
                    Screen.WIDTH - this.windowRightBuffer - (end.length * font.charWidth) - 1,
                    this.windowHeight - this.windowBotBuffer + this.yScrollOffset + this.yScrollOffset + (Screen.HEIGHT * 0.03125), // 4
                    15
                )
            }
        }
    }
}