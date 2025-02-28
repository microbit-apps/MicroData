namespace microdata {
    import Screen = user_interface_base.Screen

    /** The period that the scheduler should wait before comparing a reading with the event's inequality */
    export const SENSOR_EVENT_POLLING_PERIOD_MS: number = 100

    /**
     * Used to lookup the implemented events via sensorEventFunctionLookup[]
     * 
     * Currently only events that check for inequalities are implemented,
     *      The only sensors that are incompatible with this are Buttons
     * The following code may be generalised to support them though.
     */
    export const sensorEventSymbols = ["=", ">", "<", ">=", "<="]

    /**
     * Type for value bound to inequality key within sensorEventFunctionLookup
     * 
     * One of these is optionally held by a sensor - see by sensor.setRecordingConfig
     */
    export type SensorEventFunction = (reading: number, comparator: number) => boolean

    /** 
     * Get aa function that performs that inequality check & logs it with an event description if the event has triggered.
     */
    export const sensorEventFunctionLookup: { [inequality: string]: SensorEventFunction } = {
        "=": function(reading: number, comparator: number) { return reading == comparator },
        ">": function(reading: number, comparator: number) { return reading > comparator },
        "<": function(reading: number, comparator: number) { return reading < comparator },
        ">=": function(reading: number, comparator: number) { return reading >= comparator },
        "<=": function(reading: number, comparator: number) { return reading <= comparator }
    }

    /** How many times should a line be duplicated when drawn? */
    const PLOT_SMOOTHING_CONSTANT: number = 4

    /** To what precision whould readings fromt he sensor be cut to when they're logged? */
    const READING_PRECISION: number = 9

    /**
     * Responsible for making an array of sensors with configurations read & log their data accurately.
     * This class is used by both the DataRecorder (when an Arcade Shield is connected), and by a microbit without an Arcade Shield (see DistributedLoggingProtocol).
     * The scheduler runs in a separate thread and accounts for sensors with different numbers of measurements, periods and events.
     * see .start()
     */
    export class SensorScheduler {
        /** Ordered sensor periods */
        private schedule: { sensor: Sensor, waitTime: number }[];

        /** These are configured sensors that will be scheduled upon. */
        private sensors: Sensor[];

        /** This class can be used evven if an Arcade Shield is not connected; the 5x5 matrix will display the number of measurements for the sensor with the most time left if this is the case */
        private sensorWithMostTimeLeft: Sensor;

        /** Should the information from the sensorWithMostTimeLeft be shown on the basic's 5x5 LED matrix? */
        private showOnBasicScreen: boolean = false;

        private continueLogging: boolean;

        constructor(sensors: Sensor[], showOnBasicScreen?: boolean) {
            this.schedule = []
            this.sensors = sensors

            if (showOnBasicScreen != null)
                this.showOnBasicScreen = showOnBasicScreen

            // Get the sensor that will take the longest to complete:
            // The number of measurements this sensor has left is displayed on the microbit 5x5 led grid; when the Arcade Shield is not connected.
            this.sensorWithMostTimeLeft = sensors[0]
            let mostTimeLeft = this.sensorWithMostTimeLeft.totalMeasurements * this.sensorWithMostTimeLeft.getPeriod()

            this.sensors.forEach(sensor => {
                if ((sensor.totalMeasurements * sensor.getPeriod()) > mostTimeLeft) {
                    mostTimeLeft = sensor.totalMeasurements * sensor.getPeriod()
                    this.sensorWithMostTimeLeft = sensor
                }
            })

            this.continueLogging = true;

            // Setup schedule so that periods are in order ascending
            sensors.sort((a, b) => a.getPeriod() - b.getPeriod())
            this.schedule = sensors.map((sensor) => { return { sensor, waitTime: sensor.getPeriod() } })
        }

        //----------------------------------------------
        // Outward facing methods:
        // Invoked by distributedLogging & dataRecorder:
        //----------------------------------------------

        public loggingComplete(): boolean { return !(this.schedule.length > 0) }

        public stop() {
            this.continueLogging = false;
        }

        /**
         * Schedules the sensors and orders them to .log()
         * Runs within a separate fiber.
         * 
         * Time it takes for this algorithm to run is accounted for when calculating how long to wait inbetween logs
         * Mutates this.schedule
         * 
         * Temp disabled elements relating to callbackObj (no mem)
         * @param callbackObj is used by the DistributedLoggingProtocol; after each log & after the algorithm finishes a callback will be made
        */
        public start(callbackObj?: ITargetDataLoggedCallback) {
            const callbackAfterLog: boolean = (callbackObj == null) ? false : true

            control.inBackground(() => {
                let currentTime = 0;

                // Log all sensors once:
                for (let i = 0; i < this.schedule.length; i++) {
                    if (this.showOnBasicScreen && this.schedule[i].sensor == this.sensorWithMostTimeLeft)
                        basic.showNumber(this.sensorWithMostTimeLeft.getMeasurements())

                    // Make the datalogger log the data:
                    const logAsCSV = this.schedule[i].sensor.log(0)

                    // Optionally inform the caller of the log (In the case of the DistributedLoggingProtocol this information can be forwarded to the Commander over radio)
                    if (callbackAfterLog)
                        callbackObj.callback(logAsCSV)

                    // Clear from schedule (A sensor may only have 1 reading):
                    if (!this.schedule[i].sensor.hasMeasurements())
                        this.schedule.splice(i, 1);
                }


                let lastLogTime = input.runningTime()

                while (this.schedule.length > 0) {
                    const nextLogTime = this.schedule[0].waitTime;
                    const sleepTime = nextLogTime - currentTime;


                    // Wait the required period, discount operation time, in 100ms chunks
                    // Check if there last been a request to stop logging each chunk

                    const pauseTime = sleepTime + lastLogTime - input.runningTime() // Discount for operation time
                    for (let i = 0; i < pauseTime; i += 100) {
                        if (!this.continueLogging) {
                            return
                        }
                        basic.pause(100)
                    }
                    basic.pause(pauseTime % 100)

                    if (!this.continueLogging)
                        break;

                    lastLogTime = input.runningTime()
                    currentTime += sleepTime

                    for (let i = 0; i < this.schedule.length; i++) {
                        // Clear from schedule:
                        if (!this.schedule[i].sensor.hasMeasurements()) {
                            this.schedule.splice(i, 1);
                        }

                        // Log sensors:
                        else if (currentTime % this.schedule[i].waitTime == 0) {
                            if (this.showOnBasicScreen && this.schedule[i].sensor == this.sensorWithMostTimeLeft)
                                basic.showNumber(this.sensorWithMostTimeLeft.getMeasurements())

                            // Make the datalogger log the data:
                            const logAsCSV = this.schedule[i].sensor.log(currentTime)

                            // Optionally inform the caller of the log (In the case of the DistributedLoggingProtocol this information can be forwarded to the Commander over radio)
                            if (callbackAfterLog)
                                callbackObj.callback(logAsCSV)

                            // Update schedule with when they should next be logged:
                            if (this.schedule[i].sensor.hasMeasurements()) {
                                this.schedule[i].waitTime = nextLogTime + this.schedule[i].sensor.getPeriod()
                            }
                        }
                    }

                    // Ensure the schedule remains ordely after these potential deletions & recalculations:
                    this.schedule.sort((
                        a: { sensor: Sensor; waitTime: number; },
                        b: { sensor: Sensor; waitTime: number; }) =>
                        a.waitTime - b.waitTime
                    )
                }

                // Done:
                if (this.showOnBasicScreen) {
                    basic.showLeds(`
                        . # . # .
                        . # . # .
                        . . . . .
                        # . . . #
                        . # # # .
                    `)
                }

                if (callbackAfterLog) {
                    DistributedLoggingProtocol.finishedLogging = true
                    callbackObj.callback("")
                }
            })
        }
    }


    /**
     * Abstraction for all available sensors.
     * This class is extended by each of the concrete sensors which add on static methods for their name, getting their readings & optionally min/max readings
     */
    export class Sensor {
        /** Immutable: Forward facing name that is presented to the user in LiveDataViewer, Sensor Selection & TabularDataViewer */
        private name: string;
        /** Immutable: Name used for Radio Communication, a unique shorthand, see distributedLogging.ts */
        private radioName: string;
        /** Immutable: Minimum possible sensor reading, based on datasheet of peripheral. Some sensors transform their output (Analog pins transform 0->1023, into 0->3V volt range) */
        private minimum: number;
        /** Immutable: Maximum possible sensor reading, based on datasheet of peripheral. Some sensors transform their output (Analog pins transform 0->1023, into 0->3V volt range) */
        private maximum: number;
        /** Immutable: Abs(minimum) + Abs(maximum); calculated once at start since min & max can't change */
        private range: number;
        /** Immutable: Wrapper around the sensors call, e.g: sensorFn = () => input.acceleration(Dimension.X) */
        private sensorFn: () => number;
        /** Immutable: Need to know whether or not this sensor is on the microbit or is an external Jacdac one; see sensorSelection.ts */
        private isJacdacSensor: boolean;

        /** Set inside .setConfig() */
        public totalMeasurements: number

        /** Increased on the event of the graph zooming in for example. */
        private maxBufferSize: number

        /** 
         * Used by the live data viewer to write the small abscissa
         * Always increases: even when data buffer is shifted to avoid reaching the BUFFER_LIMIT
         */
        public numberOfReadings: number

        /** Used to determine sensor information to write in DataRecorder and liveDataViewer */
        public isInEventMode: boolean

        /**
         * Determines behaviour of .log()
         */
        private config: RecordingConfig


        /** Event statistic used by the dataRecorder. */
        public lastLoggedEventDescription: string

        /**
         * Holds the sensor's readings.
         * Filled via .readIntoBufferOnce()
         * Used by the ticker in liveDataViewer.
         * Values are shifted out from FIFO if at max capacity.
         * Needed since the entire normalisedBuffer may need to be recalculated upon scrolling or zooming.
         */
        private dataBuffer: number[]

        private lastLoggedReading: number;

        /**
         * Holds what the Y axis position should be for the corresponding read value, relative to a granted fromY value.
         * Filled alongside dataBuffer alongside .readIntoBufferOnce()
         * Entire dataBuffer may be recalculated via .normaliseDataBuffer()
         * Values are shifted out from FIFO if at max capacity.
         */
        private heightNormalisedDataBuffer: number[]

        constructor(opts: {
            name: string,
            rName: string,
            f: () => number,
            min: number,
            max: number,
            isJacdacSensor: boolean,
            setupFn?: () => void
        }) {
            this.maxBufferSize = 80
            this.totalMeasurements = 0
            this.numberOfReadings = 0
            this.isInEventMode = false

            this.lastLoggedEventDescription = ""
            this.dataBuffer = []
            this.lastLoggedReading = 0
            this.heightNormalisedDataBuffer = []

            // Data from opts:
            this.name = opts.name
            this.radioName = opts.rName
            this.minimum = opts.min
            this.maximum = opts.max
            this.range = Math.abs(this.minimum) + this.maximum
            this.sensorFn = opts.f
            this.isJacdacSensor = opts.isJacdacSensor

            // Could be additional functions required to set up the sensor (see Jacdac modules or Accelerometers):
            if (opts.setupFn != null)
                opts.setupFn();
        }

        //------------------
        // Factory Function:
        //------------------

        /**
         * Factory function used to generate a Sensor from that sensors: .getName(), sensorSelect name, or its radio name
         * This is a single factory within this abstract class to reduce binary size
         * @param name either sensor.getName(), sensor.getRadioName() or the ariaID the button that represents the sensor in SensorSelect uses.
         * @returns concrete sensor that the input name corresponds to.
         */
        public static getFromName(name: string): Sensor {
            if (name == "Accel. X" || name == "Accelerometer X" || name == "AX")
                return new Sensor({
                    name: "Accel. X",
                    rName: "AX",
                    f: () => input.acceleration(Dimension.X),
                    min: -2048,
                    max: 2048,
                    isJacdacSensor: false,
                    setupFn: () => input.setAccelerometerRange(AcceleratorRange.OneG)
                });

            else if (name == "Accel. Y" || name == "Accelerometer Y" || name == "AY")
                return new Sensor({
                    name: "Accel. Y",
                    rName: "AY",
                    f: () => input.acceleration(Dimension.Y),
                    min: -2048,
                    max: 2048,
                    isJacdacSensor: false,
                    setupFn: () => input.setAccelerometerRange(AcceleratorRange.OneG)
                });

            else if (name == "Accel. Z" || name == "Accelerometer Z" || name == "AZ")
                return new Sensor({
                    name: "Accel. Z",
                    rName: "AZ",
                    f: () => input.acceleration(Dimension.Z),
                    min: -2048,
                    max: 2048,
                    isJacdacSensor: false,
                    setupFn: () => input.setAccelerometerRange(AcceleratorRange.OneG)
                });

            else if (name == "Pitch" || name == "P")
                return new Sensor({
                    name: "Pitch",
                    rName: "P",
                    f: () => input.rotation(Rotation.Pitch),
                    min: -180,
                    max: 180,
                    isJacdacSensor: false
                });

            else if (name == "Roll" || name == "R")
                return new Sensor({
                    name: "Roll",
                    rName: "R",
                    f: () => input.rotation(Rotation.Roll),
                    min: -180,
                    max: 180,
                    isJacdacSensor: false
                });

            else if (name == "A. Pin 0" || name == "Analog Pin 0" || name == "AP0")
                return new Sensor({
                    name: "A. Pin 0",
                    rName: "AP0",
                    f: () => pins.analogReadPin(AnalogPin.P0) / 340,
                    min: 0,
                    max: 3,
                    isJacdacSensor: false
                });

            else if (name == "A. Pin 1" || name == "Analog Pin 1" || name == "AP1")
                return new Sensor({
                    name: "A. Pin 1",
                    rName: "AP1",
                    f: () => pins.analogReadPin(AnalogPin.P1) / 340,
                    min: 0,
                    max: 3,
                    isJacdacSensor: false
                });

            else if (name == "A. Pin 2" || name == "Analog Pin 2" || name == "AP2")
                return new Sensor({
                    name: "A. Pin 2",
                    rName: "AP2",
                    f: () => pins.analogReadPin(AnalogPin.P2) / 340,
                    min: 0,
                    max: 3,
                    isJacdacSensor: false
                });

            else if (name == "Light" || name == "L")
                return new Sensor({
                    name: "Light",
                    rName: "L",
                    f: () => input.lightLevel(),
                    min: 0,
                    max: 255,
                    isJacdacSensor: false
                });

            else if (name == "Temp." || name == "Temperature" || name == "T")
                return new Sensor({
                    name: "Temp.",
                    rName: "T",
                    f: () => input.temperature(),
                    min: -40,
                    max: 100,
                    isJacdacSensor: false
                });

            else if (name == "Magnet" || name == "M")
                return new Sensor({
                    name: "Magnet",
                    rName: "M",
                    f: () => input.magneticForce(Dimension.Strength),
                    min: -5000,
                    max: 5000,
                    isJacdacSensor: false
                });

            else if (name == "Logo Pressed" || name == "Logo Press" || name == "LP")
                return new Sensor({
                    name: "Logo Press",
                    rName: "LP",
                    f: () => (input.logoIsPressed() ? 1 : 0),
                    min: 0,
                    max: 1,
                    isJacdacSensor: false
                });

            else if (name == "Volume" || name == "Microphone" || name == "V")
                return new Sensor({
                    name: "Microphone",
                    rName: "V",
                    f: () => input.soundLevel(),
                    min: 0,
                    max: 255,
                    isJacdacSensor: false
                });

            else if (name == "Compass" || name == "C")
                return new Sensor({
                    name: "Compass",
                    rName: "C",
                    f: () => input.compassHeading(),
                    min: 0,
                    max: 360,
                    isJacdacSensor: false
                });

            //--------------------------------------------
            // Jacdac Sensors:
            // See https://github.com/microsoft/pxt-jacdac
            //--------------------------------------------

            else if (name == "Jac Light" || name == "Jacdac Light" || name == "JL")
                return new Sensor({
                    name: "Jac Light",
                    rName: "JL",
                    f: () => modules.lightLevel1.isConnected() ? modules.lightLevel1.lightLevel() : undefined,
                    min: 0,
                    max: 100,
                    isJacdacSensor: true,
                    setupFn: () => modules.lightLevel1.start()
                });

            else if (name == "Jac Moist" || name == "Jacdac Moisture" || name == "JM")
                return new Sensor({
                    name: "Jac Moist",
                    rName: "JM",
                    f: () => modules.soilMoisture1.isConnected() ? modules.soilMoisture1.moisture() : undefined,
                    min: 0,
                    max: 100,
                    isJacdacSensor: true,
                    setupFn: () => modules.soilMoisture1.start()
                });

            else if (name == "Jac Dist" || name == "Jacdac Distance" || name == "JD")
                return new Sensor({
                    name: "Jac Dist",
                    rName: "JD",
                    f: () => modules.distance1.isConnected() ? modules.distance1.distance() : undefined,
                    min: 0,
                    max: 4,
                    isJacdacSensor: true,
                    setupFn: () => modules.distance1.start()
                });

            else if (name == "Jac Flex" || name == "Jacdac Flex" || name == "JF")
                return new Sensor({
                    name: "Jac Flex",
                    rName: "JF",
                    f: () => modules.flex1.isConnected() ? modules.flex1.bending() : undefined,
                    min: -100,
                    max: 100,
                    isJacdacSensor: true,
                    setupFn: () => modules.flex1.start()
                });

            else
                return new Sensor({
                    name: "Jac Temp",
                    rName: "JT",
                    f: () => modules.temperature1.isConnected() ? modules.temperature1.temperature() : undefined,
                    min: -40,
                    max: 120,
                    isJacdacSensor: true,
                    setupFn: () => modules.temperature1.start()
                });
        }


        //---------------------
        // Interface Functions:
        //---------------------

        getName(): string { return this.name }
        getRadioName(): string { return this.radioName }
        getReading(): number { return this.sensorFn() }
        getNormalisedReading(): number { return Math.abs(this.getReading()) / this.range }
        getMinimum(): number { return this.minimum; }
        getMaximum(): number { return this.maximum; }
        isJacdac(): boolean { return this.isJacdacSensor; }

        getMaxBufferSize(): number { return this.maxBufferSize }
        getNthReading(n: number): number { return this.dataBuffer[n] }
        getNthHeightNormalisedReading(n: number): number { return this.heightNormalisedDataBuffer[n] }
        getBufferLength(): number { return this.dataBuffer.length }
        getHeightNormalisedBufferLength(): number { return this.heightNormalisedDataBuffer.length }
        getPeriod(): number { return this.config.period; }
        getMeasurements(): number { return this.config.measurements }
        hasMeasurements(): boolean { return this.config.measurements > 0; }


        /**
         * Used by the DataRecorder to display information about the sensor as it is logging.
         * @returns linles of information that can be printed out into a box for display.
         */
        getRecordingInformation(): string[] {
            if (this.hasMeasurements())
                return [
                    this.getPeriod() / 1000 + " second period",
                    this.config.measurements.toString() + " measurements left",
                    ((this.config.measurements * this.getPeriod()) / 1000).toString() + " seconds left",
                    "Last log was " + this.lastLoggedReading.toString().slice(0, 5),
                ]
            else
                return [
                    "Logging complete.",
                    "Last log was " + this.lastLoggedReading.toString().slice(0, 5),
                ]
        }

        /**
         * Used by the DataRecorder to display information about the sensor as it is logging.
         * @returns lines of information that can be printed out into a box for display.
         */
        getEventInformation(): string[] {
            if (this.hasMeasurements())
                return [
                    this.config.measurements.toString() + " events left",
                    "Logging " + this.config.inequality + " " + this.config.comparator + " events",
                    "Last log was " + this.lastLoggedReading.toString().slice(0, 5),
                    this.lastLoggedEventDescription
                ]

            else
                return [
                    "Logging complete.",
                    "Last log was " + this.lastLoggedReading.toString().slice(0, 5)
                ]
        }

        /**
         * Change the size of the buffer used for this.dataBuffer & this.normalisedBuffer
         * Will shift out old this.dataBuffer & this.normalisedBuffer values from the front.
         * @param newBufferSize absolute new value for both this.dataBuffer & this.normalisedBuffer
         */
        setBufferSize(newBufferSize: number): void {
            // Remove additional values if neccessary:
            if (this.dataBuffer.length > newBufferSize) {
                const difference = this.dataBuffer.length - newBufferSize
                this.dataBuffer.splice(0, difference)
                this.heightNormalisedDataBuffer.splice(0, difference)
            }
            this.maxBufferSize = newBufferSize
        }

        /**
         * Add one value to this.dataBuffer, add that value normalised into this.normalisedBuffer too.
         * No value is added if the reading is undefined (such as from a disconnected Jacdac sensor).
         * If the (this.dataBuffer.length >= this.maxBufferSize) then then the oldest values are removed.
         * @param fromY the offset by which the reading should be raised before adding to this.normalisedBuffer
         * @returns 
         */
        readIntoBufferOnce(fromY: number): void {
            const reading = this.getReading()

            if (this.dataBuffer.length >= this.maxBufferSize || reading === undefined) {
                this.dataBuffer.shift();
                this.heightNormalisedDataBuffer.shift();
            }

            if (reading === undefined)
                return

            this.numberOfReadings += 1
            this.dataBuffer.push(reading);
            this.heightNormalisedDataBuffer.push(Math.round(Screen.HEIGHT - ((reading - this.getMinimum()) / this.range) * (BUFFERED_SCREEN_HEIGHT - fromY)) - fromY);
        }

        /**
         * Populates this.normalisedBuffer with the Y position for each element in this.dataBuffer.
         * Uses BUFFERED_SCREEN_HEIGHT.
         * Invoked upon scrolling in the live-data-viewer.
         * @param fromY The y value that each element should be offset by.
         */
        normaliseDataBuffer(fromY: number) {
            const min = this.getMinimum()
            const range: number = Math.abs(min) + this.getMaximum();

            this.heightNormalisedDataBuffer = []
            for (let i = 0; i < this.dataBuffer.length; i++) {
                this.heightNormalisedDataBuffer.push(Math.round(Screen.HEIGHT - ((this.dataBuffer[i] - min) / range) * (BUFFERED_SCREEN_HEIGHT - fromY)) - fromY);
            }
        }

        /**
         * Set inside of recordingConfigSelection.
         * @param config see recordingConfigSelection.
         */
        setConfig(config: RecordingConfig) {
            const isInEventMode = config.comparator != null && config.inequality != null
            this.config = config
            this.totalMeasurements = this.config.measurements
            this.isInEventMode = isInEventMode
        }

        /**
         * Records a sensor's reading to the datalogger.
         * Will set the event column in the datalogger to "N/A" if not in event mode.
         * Invoked by dataRecorder.log().
         * Writes the "Time (Ms)" column using a cumulative period.
         */
        log(time: number): string {
            this.lastLoggedReading = this.getReading()

            const reading = this.lastLoggedReading.toString().slice(0, READING_PRECISION)

            if (this.isInEventMode) {
                if (sensorEventFunctionLookup[this.config.inequality](this.lastLoggedReading, this.config.comparator)) {
                    datalogger.log(
                        datalogger.createCV("Sensor", this.getName()),
                        datalogger.createCV("Time (ms)", time),
                        datalogger.createCV("Reading", reading),
                        datalogger.createCV("Event", this.config.inequality + " " + this.config.comparator)
                    )
                    this.config.measurements -= 1
                    return this.getRadioName() + "," + time.toString() + "," + reading + "," + this.config.inequality + " " + this.config.comparator
                }
            }

            else {
                datalogger.log(
                    datalogger.createCV("Sensor", this.getName()),
                    datalogger.createCV("Time (ms)", time.toString()),
                    datalogger.createCV("Reading", reading),
                    datalogger.createCV("Event", "N/A")
                )
                this.config.measurements -= 1
                return this.getRadioName() + "," + time.toString() + "," + reading + "," + "N/A"
            }
            return ""
        }

        /**
         * Default draw mode: may be overriden to accommodate multiple draw modes
         * Each value in the data buffer is normalised and scaled to screen size per frame.
         *      This is inefficient since only one value is added per frame
         * @param fromX starting x coordinate
         * @param color
         */
        draw(fromX: number, color: number): void {
            for (let i = 0; i < this.heightNormalisedDataBuffer.length - 1; i++) {
                for (let j = -(PLOT_SMOOTHING_CONSTANT >> 1); j < PLOT_SMOOTHING_CONSTANT >> 1; j++) {
                    screen().drawLine(
                        fromX + i,
                        this.heightNormalisedDataBuffer[i] + j,
                        fromX + i + 1,
                        this.heightNormalisedDataBuffer[i + 1] + j,
                        color
                    );
                }
            }
        }
    }
}
