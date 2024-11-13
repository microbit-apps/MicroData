namespace microdata {
    import Screen = user_interface_base.Screen
    import Scene = user_interface_base.Scene
    import AppInterface = user_interface_base.AppInterface
    import font = user_interface_base.font

    /** The colours that will be used for the lines & sensor information boxes */
    const SENSOR_COLORS: number[] = [2,3,4,6,7,9]

    /** How many times should a line be duplicated when drawn? */
    const PLOT_SMOOTHING_CONSTANT: number = 4

    /** At what point should the UI behaviour change to graph view vs sensor selection? */
    const Y_SCROLL_GRAPH_MODE_CUT_OFF: number = -60


    /**
     * Indice access alias into datalogger's columns.
     */
    enum SENSOR_COLUMNS {
        NAME = 0,
        TIME = 1,
        READING = 2,
        EVENT = 3
    }

    /**
     * Indice access alias into this.sensorMinsAndMaxs columns.
     */
    enum MIN_MAX_COLUMNS {
        MIN = 0,
        MAX = 1
    }

    /**
     * Used by this.rawCoordinates; interface for type optimisation.
     * Used since readings need to be sorted by their sensor, but the values from the datalogger may be in an unpredictable order,
     * Thus indexing by the sensorName - which is at the start of each row simplifies access.
     */
    interface ISensorReadingLookup {
        [sensorName: string]: number[];
    }

    /**
     * Is the graph or the sensors being shown?
    */
    enum UI_STATE {
        /** Graph is being shown */
        GRAPH,
        /** The sensors are being shown */
        SENSOR_SELECTION
    }

    /** y-axis scroll change when the graph is shown */
    const GRAPH_Y_AXIS_SCROLL_RATE: number = 20

    /**
     * Takes the datalogger logs and generates a labelled graph.
     * Each sensor is a unique coloured line, sensor information is detailed below.
     */
    export class GraphGenerator extends Scene {
        private windowWidth: number;
        private windowHeight: number;

        private windowLeftBuffer: number; 
        private windowRightBuffer: number;
        private windowTopBuffer: number;
        private windowBotBuffer: number;

        /** Progressed via UP & DOWN. Causes the UI to scroll - UI elements are scaled appropriately via recalculation of normalisedCoordinate Y-values. */
        private yScrollOffset: number;
        /** Progressed via LEFT & RIGHT. Causes the next chunk of data to be loaded into rawCoordinates & normalisedCoordinates to update. */
        private xScrollOffset: number;
        /** UI interaction behaviour changes if this.yScrollOffset descends past Y_SCROLL_GRAPH_MODE_CUT_OFF */
        private uiState: UI_STATE;
        /** Reconstructed from the datalogger: needed for accessing minimum and maximum readings for normalisation & y-axis. */
        private sensors: Sensor[]
        /** Each row is one sensor, the columns within the row are the raw readings from the tabular data viewer. */
        private rawCoordinates: ISensorReadingLookup
        /** Normalise rawCoordinates for the current screen size: invoked upon UP, DOWN, LEFT, RIGHT */
        private processedCoordinates: number[][];
        /** Sensors can be turned on & off when this.ui_state is SENSOR_SELECTION, by boxes below the graph. Only showSensors[n] == true are shown */
        private drawSensorStates: {[sensorName: string]: boolean};

        /** Indices of sensors that should have their first reading shown on the y-axis */
        private sensorsIndicesForYAxis: number[]
        /** Index into the datalogger that reads should begin at, indexed by this.xScrollOffset */
        private startReadingAt: number[];
        /** Lower bound for range that x-values are normalised to. Also displayed in bot left of the x-axis */
        private lowestPeriod: number
        /** Upper bound for range that x-values are normalised to. Also displayed in bot right of the x-axis */
        private greatestPeriod: number
        /** Use the sensor minimum and maximum data to wwrite information about them below the plot */
        private sensorMinsAndMaxs: number[][];
        /** After scrolling past the plot the user can select a sensor to disable/enable */
        private currentlySelectedSensorIndex: number;
        /** Lowest of sensor.minimum for all sensors: required to write at the bottom of the y-axis */
        private globalSensorMinimum: number;
        /** Greatest of sensor.maximum for all sensors: required to write at the top of the y-axis */
        private globalSensorMaximum: number;

        constructor(app: AppInterface) {
            super(app, "graphGeneration")
            this.backgroundColor = 3

            this.windowWidth = Screen.WIDTH
            this.windowHeight = Screen.HEIGHT
            this.uiState = UI_STATE.GRAPH

            this.windowLeftBuffer = 38
            this.windowRightBuffer = 10
            this.windowTopBuffer = 5
            this.windowBotBuffer = 20

            this.yScrollOffset = 0
            this.xScrollOffset = 0

            this.findSensors()

            this.drawSensorStates = {}
            this.sensorMinsAndMaxs = []
            this.startReadingAt = [0]
            
            this.sensors.forEach((sensor) => {
                this.drawSensorStates[sensor.getName()] = true
                this.sensorMinsAndMaxs.push([sensor.getMinimum(), sensor.getMaximum()])
            })

            // Unbind all controls - since .processReadings() may take some time if there are an immense amount of readings:
            // Pressing a button during this early stage of processing may crash:
            control.onEvent(ControllerButtonEvent.Pressed, controller.up.id, () => {});
            control.onEvent(ControllerButtonEvent.Pressed, controller.down.id,() => {});
            control.onEvent(ControllerButtonEvent.Pressed, controller.left.id,() => {});
            control.onEvent(ControllerButtonEvent.Pressed, controller.right.id,() => {});
            control.onEvent(ControllerButtonEvent.Pressed, controller.A.id,() => {});
            control.onEvent(ControllerButtonEvent.Pressed, controller.B.id,() => {});

            this.lowestPeriod = 0;
            this.greatestPeriod = 0;
            this.setGlobalMinAndMax();
            this.processReadings();
            this.setupSensorsToShowOnYAxis()

            //---------------
            // Bind Controls:
            //---------------

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.up.id,
                () => {
                    this.yScrollOffset = Math.min(this.yScrollOffset + GRAPH_Y_AXIS_SCROLL_RATE, 0)
                    if (this.yScrollOffset <= Y_SCROLL_GRAPH_MODE_CUT_OFF) {
                        this.uiState = UI_STATE.SENSOR_SELECTION
                        this.currentlySelectedSensorIndex = Math.abs(this.yScrollOffset + 60) / GRAPH_Y_AXIS_SCROLL_RATE
                    }
                    else
                        this.uiState = UI_STATE.GRAPH
                    this.normaliseReadingsOnYAxis();
                    this.setupSensorsToShowOnYAxis();
                    this.update() // For fast response to the above change
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.down.id,
                () => {
                    this.yScrollOffset = Math.max(this.yScrollOffset - GRAPH_Y_AXIS_SCROLL_RATE, -(this.windowHeight + 40))
                    if (this.yScrollOffset <= Y_SCROLL_GRAPH_MODE_CUT_OFF) {
                        this.uiState = UI_STATE.SENSOR_SELECTION
                        this.currentlySelectedSensorIndex = Math.abs(this.yScrollOffset + 60) / GRAPH_Y_AXIS_SCROLL_RATE
                    }
                    else
                        this.uiState = UI_STATE.GRAPH

                    this.normaliseReadingsOnYAxis();
                    this.setupSensorsToShowOnYAxis();
                    this.update() // For fast response to the above change
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.left.id,
                () => {
                    if (this.xScrollOffset > 0) {
                        this.xScrollOffset -= 1;
                        this.processReadings();
                        this.setupSensorsToShowOnYAxis();
                        this.update() // For fast response to the above changes
                    }
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.right.id,
                () => {
                    if (datalogger.getNumberOfRows(this.startReadingAt[this.xScrollOffset + 1]) > 1) {
                        this.xScrollOffset += 1;
                        this.processReadings();
                        this.setupSensorsToShowOnYAxis();
                        this.update(); // For fast response to the above changes
                    }
                }
            )

            // Select/Deselect a sensor to be drawn:
            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.A.id,
                () => {
                    if (this.uiState == UI_STATE.SENSOR_SELECTION) {
                        const sensorName = this.sensors[this.currentlySelectedSensorIndex].getName()
                        this.drawSensorStates[sensorName] = !this.drawSensorStates[sensorName]
                        this.setGlobalMinAndMax()
                    }
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.B.id,
                () => {
                    this.app.popScene()
                    this.app.pushScene(new DataViewSelect(this.app))
                }
            )
        }

        /**
         * Build this.sensors with the same sensors that are logged.
         * This is neccessary for getMinimum() & getMaximum() which are required for normalisation & display.
         */
        private findSensors() {
            this.sensors = []
            let sensorNames: string[] = []
            const stdChunkSize = this.windowWidth - this.windowLeftBuffer - this.windowRightBuffer;

            let dataStart = 1
            while (datalogger.getNumberOfRows(dataStart) > 0) {
                const rows = datalogger.getRows(dataStart, Math.min(stdChunkSize, datalogger.getNumberOfRows(dataStart))).split("\n")

                for (let i = 0; i < rows.length - 1; i++) {
                    const sensorName = rows[i].split(",", 1)[SENSOR_COLUMNS.NAME]
                    let sensorNameAlreadyKnown = false

                    for (let j = 0; j < sensorNames.length; j++) {
                        if (sensorName == sensorNames[j]) {
                            sensorNameAlreadyKnown = true
                            break;
                        }
                    }

                    if (!sensorNameAlreadyKnown) {
                        sensorNames.push(sensorName)
                    }
                }
                dataStart += rows.length
            }
            this.sensors = sensorNames.map((name) => Sensor.getFromName(name))
        }

        /**
         * Looks through the current active sensors and finds the lowest minimum & highest maximum among them.
         * Sets: this.globalSensorMinimum & this.globalSensorMaximum.
         * Re-invoked upon disabling a sensor.
         * These two variables will then be displayed at the bot & top of the y-axis.
         */
        private setGlobalMinAndMax() {
            this.globalSensorMinimum = null
            this.globalSensorMaximum = null
            
            // Get the minimum and maximum sensor readings:
            for (let i = 0; i < this.sensors.length; i++) {
                const sensor: Sensor = this.sensors[i]
                if (this.drawSensorStates[sensor.getName()]) {
                    // Minimum and Maximum sensor readings for the y-axis markers
                    if (sensor.getMinimum() < this.globalSensorMinimum || this.globalSensorMinimum == null)
                        this.globalSensorMinimum = sensor.getMinimum()

                    if (sensor.getMaximum() > this.globalSensorMaximum || this.globalSensorMaximum == null)
                        this.globalSensorMaximum = sensor.getMaximum()
                }
            }
        }

        /**
         * Normalise the readings in this.dataRows relative to the screen().
         * Invoked upon UP, DOWN, LEFT, RIGHT.
         * Fills this.readings, then invokes this.normaliseReadings() to setup this.normalisedReadings
         */
        private processReadings() {
            this.rawCoordinates = {};
            this.startReadingAt[this.xScrollOffset + 1] = 0;
            this.lowestPeriod = 0;

            /**
             * Keep track of the last period & reading recorded
             * Since if there is only 1 element on a new chunk (after scrolling right) the last reading of that prior chunk should be used.
             * This creates the graphical effect that the new chunk is a direct continuation of the prior via a contigious line.
             */
            let lastRawCoordinate: ISensorReadingLookup = {};
            for (let i = 0; i < this.sensors.length; i++) {
                this.rawCoordinates[this.sensors[i].getName()] = [];
                lastRawCoordinate[this.sensors[i].getName()] = [0, 0];
            }

            // Aim to fill the graphical window area:
            const targetNumberOfReadings = this.windowWidth - this.windowLeftBuffer - this.windowRightBuffer;

            let dataStart = this.startReadingAt[this.xScrollOffset] + 1 // Skip header
            let currentPeriod: number = 0  // X-axis component of coordinate
            let currentReading: number = 0 // Y-axis component of coordinate

            let foundAllReadings = false
            while (!foundAllReadings && datalogger.getNumberOfRows(dataStart) > 0) {
                const rows = datalogger.getRows(dataStart, Math.min(targetNumberOfReadings, datalogger.getNumberOfRows(dataStart))).split("\n")

                for (let i = 0; i < rows.length; i++) {
                    const cols = rows[i].split(",") // [name, time, reading, event]
                    lastRawCoordinate[cols[SENSOR_COLUMNS.NAME]] = [currentReading, currentPeriod]
                    currentPeriod = +cols[SENSOR_COLUMNS.TIME]
                    currentReading = +cols[SENSOR_COLUMNS.READING]

                    // Setup the lowestPeriod if at the start:
                    if (dataStart == this.startReadingAt[this.xScrollOffset] + 1 && i == 0)
                        this.lowestPeriod = currentPeriod

                    // Add reading & period; check if full:
                    if (this.rawCoordinates[cols[SENSOR_COLUMNS.NAME]].length / 2 < targetNumberOfReadings) {
                        this.rawCoordinates[cols[SENSOR_COLUMNS.NAME]].push(currentPeriod)  // X
                        this.rawCoordinates[cols[SENSOR_COLUMNS.NAME]].push(currentReading) // Y

                        // rawCoordinates for this sensor is full: Thus start reading next chunk (where next RIGHT press starts) here:
                        if ((this.rawCoordinates[cols[SENSOR_COLUMNS.NAME]].length / 2) >= targetNumberOfReadings && this.startReadingAt[this.xScrollOffset + 1] == 0)
                            this.startReadingAt[this.xScrollOffset + 1] = dataStart + i
                        
                        // Check if all are done:
                        foundAllReadings = true
                        for (let j = 0; j < this.sensors.length; j++) {
                            if ((this.rawCoordinates[this.sensors[j].getName()].length / 2) < targetNumberOfReadings) {
                                foundAllReadings = false
                                break
                            }
                        }

                        if (foundAllReadings)
                            break
                    }
                }
                dataStart += rows.length
            }

            // this.startReadingAt was never set (this occurs in the case where the none of this.rawCoordinates were filled up)
            // This means that all values were read; so just put the pointer at the end:
            // This means that datalogger.getNumberOfRows(this.startReadingAt[this.xScrollOffset + 1]) returns 0
            if (this.startReadingAt[this.xScrollOffset + 1] == 0) {
                this.startReadingAt[this.xScrollOffset + 1] = dataStart; // this.rawCoordinates[sensorName].length
            }

            // Setup this.greatestPeriod & prepend the last read value if neccessary:
            this.greatestPeriod = 0
            for (let i = 0; i < this.sensors.length; i++) {
                const sensorName = this.sensors[i].getName()
                const lastPeriodIndex = this.rawCoordinates[sensorName].length - 2

                if (this.rawCoordinates[sensorName][lastPeriodIndex] > this.greatestPeriod)
                    this.greatestPeriod = this.rawCoordinates[sensorName][lastPeriodIndex]

                // If there is only one element add the last one from the prior screen,
                // This makes it look like a smooth continuation.
                if (this.rawCoordinates[sensorName].length == 1) {
                    const period = this.rawCoordinates[sensorName][0]
                    const reading = this.rawCoordinates[sensorName][1]
                    this.rawCoordinates[sensorName].push(period)
                    this.rawCoordinates[sensorName].push(reading)
                }
            }

            this.resetProcessedCoordinates()
            this.normaliseReadingsOnXAxis()
            this.normaliseReadingsOnYAxis()
        }


        /**
         * Reset this.normalisedCoordinates & fill to the same size as this.rawCoordinates - except all elements are undefined.
         * This is neccessary for this.normaliseReadingsOnXAxis() && this.normaliseReadingsOnYAxis() to fill them,
         * Since they will fill via index access instead of pushing.
         */
        private resetProcessedCoordinates() {
            this.processedCoordinates = []
            for (let i = 0; i < this.sensors.length; i++)
                this.processedCoordinates[i] = this.rawCoordinates[this.sensors[i].getName()].map(_ => undefined)
        }

        /**
         * Calculate the x-axis position of each of these readings for use in .draw()
         */
        private normaliseReadingsOnXAxis() {
            for (let sensor = 0; sensor < this.sensors.length; sensor++) {
                const sensorName: string = this.sensors[sensor].getName();
                const minimum: number = this.lowestPeriod;
                const range: number = minimum + this.greatestPeriod;
                
                // Start at 1 since first readings are [x1,y1,x2,y2,....]:
                for (let i = 0; i < this.rawCoordinates[sensorName].length - 1; i+=2) {                    
                    const norm1 = ((this.rawCoordinates[sensorName][i] - minimum) / range) * (Screen.WIDTH - this.windowRightBuffer - this.windowLeftBuffer - 2);
                    this.processedCoordinates[sensor][i] = this.windowLeftBuffer + norm1;
                }
            }
        }

        /**
         * Calculate the y-axis position of each of these readings for use in .draw()
         */
        private normaliseReadingsOnYAxis() {
            const fromY = this.windowBotBuffer - (2 * this.yScrollOffset);

            for (let sensor = 0; sensor < this.sensors.length; sensor++) {
                const sensorName: string = this.sensors[sensor].getName();
                const minimum: number = this.sensors[sensor].getMinimum();
                const range: number = Math.abs(minimum) + this.sensors[sensor].getMaximum();
                
                // Start at 0 since first readings are [x1,y1,x2,y2,....]:
                for (let i = 1; i < this.rawCoordinates[sensorName].length - 1; i+=2) {   
                    const norm1 = ((this.rawCoordinates[sensorName][i] - minimum) / range) * (BUFFERED_SCREEN_HEIGHT - fromY);
                    this.processedCoordinates[sensor][i] = Math.round(Screen.HEIGHT - norm1) - fromY;
                }
            }
        }

        /**
         * Fill this.sensorsToShowOnYAxis with indices of senosrs that are permissable to draw without overlapping.
         * Invoked after scrolling LEFT or RIGHT.
         */
        private setupSensorsToShowOnYAxis() {
            const boundary: number = 5;
            const globalSensorMinimumDraw: number = this.windowHeight - this.windowBotBuffer + this.yScrollOffset + this.yScrollOffset - 4
            const globalSensorMaximumDraw: number = Screen.HEIGHT - this.windowHeight + this.windowTopBuffer - Math.floor(0.1 * this.yScrollOffset)
            
            this.sensorsIndicesForYAxis = []

            for (let i = 0; i < this.sensors.length; i++) {
                const y = this.processedCoordinates[i][1] - Math.floor(0.1 * this.yScrollOffset) - 1;
                const minOverlap = Math.abs(globalSensorMinimumDraw - y) < boundary;
                const maxOverlap = Math.abs(globalSensorMaximumDraw - y) < boundary;

                if (!this.drawSensorStates[this.sensors[i].getName()] || minOverlap || maxOverlap)
                    continue

                if (this.sensorsIndicesForYAxis.length == 0)
                    this.sensorsIndicesForYAxis.push(i);

                let isOverlap = false;
                for (let j = 0; j < this.sensorsIndicesForYAxis.length; j++) {
                    if (this.sensorsIndicesForYAxis[j] != i) {
                        const index = this.sensorsIndicesForYAxis[j];
                        const otherY = this.processedCoordinates[index][1] - Math.floor(0.1 * this.yScrollOffset) - 1;
                        
                        const otherOverlap = Math.abs(y - otherY) < boundary;
                        const minOverlap = Math.abs(globalSensorMinimumDraw - otherY) < boundary;
                        const maxOverlap = Math.abs(globalSensorMaximumDraw - otherY) < boundary;
                        
                        if (minOverlap || maxOverlap || (this.drawSensorStates[this.sensors[i].getName()] && otherOverlap)) {
                            isOverlap = true;
                            break;
                        }
                    }
                }
                if (!isOverlap)
                    this.sensorsIndicesForYAxis.push(i);
            }
        }

        update() {
            screen().fill(this.backgroundColor);
            
            // Make graph region black:
            screen().fillRect(
                this.windowLeftBuffer,
                this.windowTopBuffer + this.yScrollOffset + this.yScrollOffset, 
                Screen.WIDTH - this.windowLeftBuffer - this.windowRightBuffer,
                this.windowHeight - this.windowBotBuffer - 4,
                15
            );

            // Markers & axes:
            this.draw_axes();

            //------------------
            // Draw sensor data:
            //------------------
            if (this.yScrollOffset > Y_SCROLL_GRAPH_MODE_CUT_OFF) {
                // Draw the data from each sensor, as a separate coloured line: sensors may have variable quantities of data:
                for (let sensor = 0; sensor < this.sensors.length; sensor++) {
                    // Each coord in [x1, y1, x2, y2, x3, y3, ...]:
                    for (let i = 0; i < this.processedCoordinates[sensor].length - 4; i+=2) {
                        // Not disabled:
                        if (this.drawSensorStates[this.sensors[sensor].getName()]) {
                            const diff = Math.abs(this.processedCoordinates[sensor][i+1] - this.processedCoordinates[sensor][i+3])
                            
                            // Duplicate the line along the y axis to smooth out aliasing:
                            for (let j = -(PLOT_SMOOTHING_CONSTANT / 2); j < PLOT_SMOOTHING_CONSTANT / 2; j++) {
                                screen().drawLine(
                                    this.processedCoordinates[sensor][i]   + 1,
                                    this.processedCoordinates[sensor][i+1] + j,
                                    this.processedCoordinates[sensor][i+2] + 1,
                                    this.processedCoordinates[sensor][i+3] + j,
                                    SENSOR_COLORS[sensor % SENSOR_COLORS.length]
                                );
                            }
                        }
                    }
                }
            }
            
            //---------------
            // Sensor blocks:
            //---------------

            let y = this.windowHeight - 2 + (2 * this.yScrollOffset)
            for (let i = 0; i < this.sensors.length; i++) {
                // Black edges:
                screen().fillRect(
                    5,
                    y,
                    142,
                    47,
                    15
                )

                // Sensor is disabled:
                let blockColor: number = SENSOR_COLORS[(i % this.sensors.length) % SENSOR_COLORS.length]
                let textColor: number = 15; // black

                if (!this.drawSensorStates[this.sensors[i].getName()]) {
                    blockColor = 15; // black
                    textColor = 1;   // white
                }

                // Coloured block:
                screen().fillRect(
                    7,
                    y,
                    145,
                    45,
                    blockColor
                )

                // Blue outline for selected sensor:
                if (this.uiState == UI_STATE.SENSOR_SELECTION && i == this.currentlySelectedSensorIndex) {
                    // Blue edges:
                    for (let thickness = 0; thickness < 3; thickness++) {
                        screen().drawRect(
                            7 - thickness,
                            y - thickness,
                            145 + thickness,
                            45 + thickness,
                            6
                        )
                    }
                }

                //--------------------
                // Sensor information:
                //--------------------

                screen().print(
                    this.sensors[i].getName(),
                    12,
                    y + 2,
                    textColor
                )

                screen().print(
                    "Minimum: " + this.sensorMinsAndMaxs[i][MIN_MAX_COLUMNS.MIN],
                    12,
                    y + 16,
                    textColor
                )

                screen().print(
                    "Maximum: " + this.sensorMinsAndMaxs[i][MIN_MAX_COLUMNS.MAX],
                    12,
                    y + 32,
                    textColor
                )

                y += 55
            }
        }

        /**
         * Draw x & y axis Double-thickness each, in yellow
         * Draw abscissa and ordinate
         */
        draw_axes() {
            for (let i = 0; i < 2; i++) {
                screen().drawLine(
                    this.windowLeftBuffer,
                    this.windowHeight - this.windowBotBuffer + i + this.yScrollOffset + this.yScrollOffset, 
                    this.windowWidth - this.windowRightBuffer, 
                    this.windowHeight - this.windowBotBuffer + i + this.yScrollOffset + this.yScrollOffset, 
                    5
                );
                screen().drawLine(
                    this.windowLeftBuffer + i, 
                    this.windowTopBuffer + this.yScrollOffset + this.yScrollOffset, 
                    this.windowLeftBuffer + i, 
                    this.windowHeight - this.windowBotBuffer + this.yScrollOffset + this.yScrollOffset, 
                    5
                );
            }

            // Y axis:
            if (this.yScrollOffset > Y_SCROLL_GRAPH_MODE_CUT_OFF) {
                if (this.globalSensorMinimum != null && this.globalSensorMaximum != null) {
                    const globalSensorMinimum: string = this.globalSensorMinimum.toString()
                    const globalSensorMaximum: string = this.globalSensorMaximum.toString()
                    const globalSensorMinimumDraw: number = this.windowHeight - this.windowBotBuffer + this.yScrollOffset + this.yScrollOffset - 4
                    const globalSensorMaximumDraw: number = Screen.HEIGHT - this.windowHeight + this.windowTopBuffer - Math.floor(0.1 * this.yScrollOffset)

                    // Bot:
                    screen().print(
                        globalSensorMinimum,
                        (6 * font.charWidth) - (globalSensorMinimum.length * font.charWidth),
                        globalSensorMinimumDraw,
                        15
                    );

                    // Middle y-axis values: one per sensor: skip if too close to others:
                    for (let i = 0; i < this.sensorsIndicesForYAxis.length; i++) {
                        const index = this.sensorsIndicesForYAxis[i]
                        if (this.drawSensorStates[this.sensors[index].getName()]) {
                            const yWrite: string = this.rawCoordinates[this.sensors[index].getName()][1].toString().slice(0, 5);
                            const yDraw = this.processedCoordinates[index][1] - Math.floor(0.1 * this.yScrollOffset) - 1;
                            screen().print(
                                yWrite,
                                (6 * font.charWidth) - (yWrite.length * font.charWidth),
                                yDraw,
                                15
                            );
                        }
                    }

                    // Top:
                    screen().print(
                        globalSensorMaximum,
                        (6 * font.charWidth) - (globalSensorMaximum.length * font.charWidth),
                        globalSensorMaximumDraw,
                        15
                    )
                }
            }

            // X axis:
            // Start
            screen().print(
                this.lowestPeriod / 1000 + "s",
                this.windowLeftBuffer - 2,
                this.windowHeight - this.windowBotBuffer + this.yScrollOffset + this.yScrollOffset + 4,
                15
            )

            // End:
            const end: string = this.greatestPeriod / 1000 + "s";
            screen().print(
                end,
                Screen.WIDTH - this.windowRightBuffer - (end.length * font.charWidth),
                this.windowHeight - this.windowBotBuffer + this.yScrollOffset + this.yScrollOffset + 4,
                15
            )
        }
    }
}