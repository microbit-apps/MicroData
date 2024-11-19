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
    export const sensorEventFunctionLookup: {[inequality: string]: SensorEventFunction} = {
        "=":  function(reading: number, comparator: number) {return reading == comparator},
        ">":  function(reading: number, comparator: number) {return reading >  comparator},
        "<":  function(reading: number, comparator: number) {return reading <  comparator},
        ">=": function(reading: number, comparator: number) {return reading >= comparator},
        "<=": function(reading: number, comparator: number) {return reading <= comparator}
    }

    /** Value returned by default if the abstract getMinimum() is not overriddent */
    const DEFAULT_SENSOR_MINIMUM = 0
    /** Value returned by default if the abstract getMaximum() is not overriddent */
    const DEFAULT_SENSOR_MAXIMUM = 100

    /** How many times should a line be duplicated when drawn? */
    const PLOT_SMOOTHING_CONSTANT: number = 4

    /** To what precision whould readings fromt he sensor be cut to when they're logged? */
    const READING_PRECISION: number = 8

    /**
     * Only used within this sensor file.
     * Unique attributes to each sensor.
     * Concrete sensor implementations may override.
     */
    interface ISensorable {
        //---------------------------------------------------------------
        // Core sensor Information: Modified by concrete implementations:
        //---------------------------------------------------------------

        /**
         * Overriden by ALL concrete sensor implementations.
         */
        getName(): string;

        /**
         * Overriden by ALL concrete sensor implementations.
         */
        getRadioName(): string;

        /**
         * Overriden by ALL concrete sensor implementations.
         * May be return undefined (unconnected Jacdac)
         * This is caught inside of .readIntoBufferOnce()
         */
        getReading(): number;

        /**
         * NOT overriden by sensor implementations. It uses .getReading(), .getMinimum() & .getMaximum() which all ARE overriden.
         */
        getNormalisedReading(): number;

        /**
         * Overriden by some concrete sensor implementations.
         */
        getMinimum(): number;

        /**
         * Overriden by some concrete sensor implementations.
         */
        getMaximum(): number;
        
        /**
         * Overriden by ALL Jacdac concrete sensor implementations.
         */
        isJacdac(): boolean;


        //--------------------------
        // Simple Getters & Setters:
        //--------------------------

        /**
         * Not overriden by any concrete sensor implmentation.
         */
        getMaxBufferSize(): number;

        /**
         * Not overriden by any concrete sensor implmentation.
         */
        getNthReading(n: number): number;
        
        /**
         * Not overriden by any concrete sensor implmentation.
         */
        getNthHeightNormalisedReading(n: number): number;
        
        /**
         * Not overriden by any concrete sensor implmentation.
         */
        getBufferLength(): number;
        
        /**
         * Not overriden by any concrete sensor implmentation.
         */
        getHeightNormalisedBufferLength(): number;
        
        /**
         * Not overriden by any concrete sensor implmentation.
         */
        getPeriod(): number;

        /**
         * Not overriden by any concrete sensor implmentation.
         */
        getMeasurements(): number;
        
        /**
         * Not overriden by any concrete sensor implmentation.
         */
        hasMeasurements(): boolean;


        //-------------------------
        // More complex behaviours:
        //-------------------------

        /**
         * Not overriden by any concrete sensor implmentation.
         * Returns 3 strings each with a line about the sensor's recording information.
         * Used in dataRecorder
         */
        getRecordingInformation(): string[];

        /**
         * Not overriden by any concrete sensor implmentation.
         * Returns 3 strings each with a line about the sensor's event information.
         * Used in dataRecorder
         */
        getEventInformation(): string[];

        
        /**
         * Not overriden by any concrete sensor implmentation.
         */
        setBufferSize(newBufferSize: number): void;

        /**
         * Add one value to this.dataBuffer, add that value normalised into this.normalisedBuffer too.
         * No value is added if the reading is undefined (such as from a disconnected Jacdac sensor).
         * If the (this.dataBuffer.length >= this.maxBufferSize) then then the oldest values are removed.
         * @param fromY the offset by which the reading should be raised before adding to this.normalisedBuffer
         * @returns 
         */
        readIntoBufferOnce(fromY: number): void;

        /**
         * Populates this.normalisedBuffer with the Y position for each element in this.dataBuffer.
         * Uses BUFFERED_SCREEN_HEIGHT.
         * Invoked upon scrolling in the live-data-viewer
         * @param fromY The y value that each element should be offset by.
         */
        normaliseDataBuffer(fromY: number): void;

        /**
         * Invoked inside of recordingConfigSelection.
         * @param config see recordingConfigSelection
         * @param isInEventMode will this sensor be used to track events?
         */
        setConfig(config: RecordingConfig): void;

        /**
         * Records a sensor's reading to the datalogger.
         * Will set the event column in the datalogger to "N/A" if not in event mode.
         * Invoked by dataRecorder.log().
         * Writes the "Time (Ms)" column using a cumulative period.
         */
        log(time: number): string;
    }



    /**
     * Responsible for making an array of sensors with configurations read & log their data accurately.
     * This class is used by both the DataRecorder (when an Arcade Shield is connected), and by a microbit without an Arcade Shield (see DistributedLoggingProtocol).
     * The scheduler runs in a separate thread and accounts for sensors with different numbers of measurements, periods and events.
     * see .start()
     */
    export class SensorScheduler {
        /** Ordered sensor periods */
        private schedule: {sensor: Sensor, waitTime: number}[];

        /** These are configured sensors that will be scheduled upon. */
        private sensors: Sensor[];

        /** This class can be used evven if an Arcade Shield is not connected; the 5x5 matrix will display the number of measurements for the sensor with the most time left if this is the case */
        private sensorWithMostTimeLeft: Sensor

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
            this.schedule = sensors.map((sensor) => {return {sensor, waitTime: sensor.getPeriod()}})
        }


        loggingComplete(): boolean {return !(this.schedule.length > 0)}


        stop() {
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
        start() {//callbackObj?: ITargetDataLoggedCallback) {
            // const callbackAfterLog: boolean = (callbackObj == null) ? false : true
            
            control.inBackground(() => {
                let currentTime = 0;

                // Log all sensors once:
                for (let i = 0; i < this.schedule.length; i++) {
                    if (this.showOnBasicScreen && this.schedule[i].sensor == this.sensorWithMostTimeLeft)
                        basic.showNumber(this.sensorWithMostTimeLeft.getMeasurements())

                    // Make the datalogger log the data:
                    const logAsCSV = this.schedule[i].sensor.log(0)

                    // Optionally inform the caller of the log (In the case of the DistributedLoggingProtocol this information can be forwarded to the Commander over radio)
                    // if (callbackAfterLog)
                    //     callbackObj.callback(logAsCSV)

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
                    for (let i = 0; i < pauseTime; i+=100) {
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
                            // if (callbackAfterLog)
                            //     callbackObj.callback(logAsCSV)

                            // Update schedule with when they should next be logged:
                            if (this.schedule[i].sensor.hasMeasurements()) {
                                this.schedule[i].waitTime = nextLogTime + this.schedule[i].sensor.getPeriod()
                            }
                        }
                    }

                    // Ensure the schedule remains ordely after these potential deletions & recalculations:
                    this.schedule.sort((
                        a: {sensor: Sensor; waitTime: number;}, 
                        b: {sensor: Sensor; waitTime: number;}) =>
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

                // if (callbackAfterLog) {
                //     DistributedLoggingProtocol.finishedLogging = true
                //     callbackObj.callback("")
                // }
            })
        }
    }


    /**
     * Abstraction for all available sensors.
     * This class is extended by each of the concrete sensors which add on static methods for their name, getting their readings & optionally min/max readings
     */
    export abstract class Sensor implements ISensorable {
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

        constructor() {
            this.maxBufferSize = 80
            this.totalMeasurements = 0
            this.numberOfReadings = 0
            this.isInEventMode = false

            this.lastLoggedEventDescription = ""
            this.dataBuffer = []
            this.lastLoggedReading = 0
            this.heightNormalisedDataBuffer = []
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
            if      (name == "Accel. X" || name == "Accelerometer X" || name == "AX")  return new AccelerometerXSensor();
            else if (name == "Accel. Y" || name == "Accelerometer Y" || name == "AY")  return new AccelerometerYSensor();
            else if (name == "Accel. Z" || name == "Accelerometer Z" || name == "AZ")  return new AccelerometerZSensor();
            else if (name == "Pitch" || name == "P")                                   return new PitchSensor();
            else if (name == "Roll" || name == "R")                                    return new RollSensor();
            else if (name == "T. Pin 0" || name == "Touch Pin 0" || name == "TP0")     return new TouchPinP0Sensor();
            else if (name == "T. Pin 1" || name == "Touch Pin 1" || name == "TP1")     return new TouchPinP1Sensor();
            else if (name == "T. Pin 2" || name == "Touch Pin 2" || name == "TP2")     return new TouchPinP2Sensor();
            else if (name == "A. Pin 0" || name == "Analog Pin 0" || name == "AP0")    return new AnalogPinP0Sensor();
            else if (name == "A. Pin 1" || name == "Analog Pin 1" || name == "AP1")    return new AnalogPinP1Sensor();
            else if (name == "A. Pin 2" || name == "Analog Pin 2" || name == "AP2")    return new AnalogPinP2Sensor();
            else if (name == "Light" || name == "L")                                   return new LightSensor();
            else if (name == "Temp." || name == "Temperature" || name == "T")          return new TemperatureSensor();
            else if (name == "Magnet" || name == "M")                                  return new MagnetSensor();
            else if (name == "Logo Pressed" || name == "Logo Press" || name == "LP")   return new LogoPressSensor();
            else if (name == "Volume" || name == "Microphone" || name == "V")          return new VolumeSensor();
            else if (name == "Compass" || name == "C")                                 return new CompassHeadingSensor();
            else if (name == "Jac Light" || name == "Jacdac Light" || name == "JL")    return new JacdacLightSensor();
            else if (name == "Jac Moist" || name == "Jacdac Moisture" || name == "JM") return new JacdacSoilMoistureSensor();
            else if (name == "Jac Dist" || name == "Jacdac Distance" || name == "JD")  return new JacdacDistanceSensor();
            // else if (name == "Jac Flex" || name == "Jacdac Flex" || name == "JF")      return new JacdacFlexSensor();
            else                                                                       return new JacdacTemperatureSensor()
        }

        //---------------------
        // Interface Functions:
        //---------------------

        getName(): string {return "abstract"}
        getRadioName(): string {return "abstract"}
        getReading(): number {return 0}
        getNormalisedReading(): number {return Math.abs(this.getReading()) / (Math.abs(this.getMinimum()) + this.getMaximum())}
        getMinimum(): number {return DEFAULT_SENSOR_MINIMUM;}
        getMaximum(): number {return DEFAULT_SENSOR_MAXIMUM;}
        isJacdac(): boolean {return false;}

        getMaxBufferSize(): number {return this.maxBufferSize}
        getNthReading(n: number): number {return this.dataBuffer[n]}
        getNthHeightNormalisedReading(n: number): number {return this.heightNormalisedDataBuffer[n]}
        getBufferLength(): number {return this.dataBuffer.length}
        getHeightNormalisedBufferLength(): number {return this.heightNormalisedDataBuffer.length}
        getPeriod(): number {return this.config.period;}
        getMeasurements(): number {return this.config.measurements}
        hasMeasurements(): boolean {return this.config.measurements > 0;}


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
                    "Last log was " + this.lastLoggedReading.toString().slice(0, 6),
                ]
            else
                return [
                    "Logging complete.",
                    "Last log was " + this.lastLoggedReading.toString().slice(0, 6),
                ]
        }
        
        /**
         * Used by the DataRecorder to display information about the sensor as it is logging.
         * @returns linles of information that can be printed out into a box for display.
         */
        getEventInformation(): string[] {
            if (this.hasMeasurements())
                return [
                    this.config.measurements.toString() + " events left",
                    "Logging " + this.config.inequality + " " + this.config.comparator + " events",
                    "Last log was " + this.lastLoggedReading.toString().slice(0, 6),
                    this.lastLoggedEventDescription
                ]

            else
                return [
                    "Logging complete.",
                    "Last log was " + this.lastLoggedReading.toString().slice(0, 6)
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
            const range: number = Math.abs(this.getMinimum()) + this.getMaximum();
            this.dataBuffer.push(reading);
            this.heightNormalisedDataBuffer.push(Math.round(Screen.HEIGHT - ((reading - this.getMinimum()) / range) * (BUFFERED_SCREEN_HEIGHT - fromY)) - fromY);
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
                for (let j = -(PLOT_SMOOTHING_CONSTANT / 2); j < PLOT_SMOOTHING_CONSTANT / 2; j++) {
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

    /**
     * Concrete implementation of onboard Light Sensor.
     * Ranged between 0 and 255
     */
    export class LightSensor extends Sensor {
        constructor() {super()}

        public static getName(): string {return "Light"}
        public static getRadioName(): string {return "L"}
        public static getReading(): number {return input.lightLevel()}
        public static getMinimum(): number {return 0;}
        public static getMaximum(): number {return 255;}   
    }

    /**
     * Concrete implementation of onboard Thermometer.
     * Ranged between -40 and 100
     */
    export class TemperatureSensor extends Sensor {
        constructor() {super()}

        public static getName(): string {return "Temp."}
        public static getRadioName(): string {return "T"}
        public static getMinimum(): number {return -40;}
        public static getMaximum(): number {return 100;}
        public static getReading(): number {return input.temperature()}
    }

    /**
     * Concrete implementation of onboard Accelerometer with Dimension X
     * Cannot be bundled with other Accelerometer's since getName() needs to be static.
     * AcceleratorRange is set to OneG
     * Ranged between -2048 to 2048
     */
    export class AccelerometerXSensor extends Sensor {
        constructor() {
            super()
            input.setAccelerometerRange(AcceleratorRange.OneG)
        }

        public static getName(): string {return "Accel. X"}
        public static getRadioName(): string {return "AX"}
        public static getReading(): number {return input.acceleration(Dimension.X)}
        public static getMinimum(): number {return -2048;}
        public static getMaximum(): number {return 2048;}
        
    }

    /**
     * Concrete implementation of onboard Accelerometer with Dimension Y
     * Cannot be bundled with other Accelerometer's since getName() needs to be static.
     * AcceleratorRange is set to OneG
     * Ranged between -2048 to 2048
     */
    export class AccelerometerYSensor extends Sensor {
        constructor() {
            super()
            input.setAccelerometerRange(AcceleratorRange.OneG)
        }

        public static getName(): string {return "Accel. Y"}
        public static getRadioName(): string {return "AY"}
        public static getReading(): number {return input.acceleration(Dimension.Y)}
        public static getMinimum(): number {return -2048;}
        public static getMaximum(): number {return 2048;}
        
    }

    /**
     * Concrete implementation of onboard Accelerometer with Dimension Z
     * Cannot be bundled with other Accelerometer's since getName() needs to be static.
     * AcceleratorRange is set to OneG
     * Ranged between -2048 to 2048
     */
    export class AccelerometerZSensor extends Sensor {
        constructor() {
            super()
            input.setAccelerometerRange(AcceleratorRange.OneG)
        }

        public static getName(): string {return "Accel. Z"}
        public static getRadioName(): string {return "AZ"}
        public static getReading(): number {return input.acceleration(Dimension.Z)}
        public static getMinimum(): number {return -2048;}
        public static getMaximum(): number {return 2048;}
        
    }

    /**
     * Touchpin sensor.
     * Need to hold both Ground and this Pin for an effect.
     */
    export class TouchPinP0Sensor extends Sensor {
        private static pinStatus: number
        public static isActive: boolean = false

        constructor() {
            super()

            TouchPinP0Sensor.pinStatus = 0;
            input.onPinPressed(TouchPin.P0, function () {
                TouchPinP0Sensor.pinStatus = (TouchPinP0Sensor.pinStatus == 1) ? 0 : 1
            })
        }

        public static getName(): string {return "T. Pin 0"}
        public static getRadioName(): string {return "TP0"}
        public static getReading(): number {return TouchPinP0Sensor.pinStatus}
        public static getMinimum(): number {return 0;}
        public static getMaximum(): number {return 1;}
    }

    /**
     * Touchpin sensor.
     * Need to hold both Ground and this Pin for an effect.
     */
    export class TouchPinP1Sensor extends Sensor {
        private static pinStatus: number
        public static isActive: boolean = false

        constructor() {
            super()

            TouchPinP1Sensor.pinStatus = 0;
            input.onPinReleased(TouchPin.P1, () => {
                TouchPinP1Sensor.pinStatus = (TouchPinP1Sensor.pinStatus == 0) ? 1 : 0
            })
        }

        public static getName(): string {return "T. Pin 1"}
        public static getRadioName(): string {return "TP1"}
        public static getReading(): number {return TouchPinP1Sensor.pinStatus}
        public static getMinimum(): number {return 0;}
        public static getMaximum(): number {return 1;}
    }

    /**
     * Touchpin sensor.
     * Need to hold both Ground and this Pin for an effect.
     */
    export class TouchPinP2Sensor extends Sensor {
        private static pinStatus: number
        public static isActive: boolean = false

        constructor() {
            super()
            
            TouchPinP2Sensor.pinStatus = 0;
            input.onPinPressed(TouchPin.P2, function () {
                TouchPinP2Sensor.pinStatus = (TouchPinP2Sensor.pinStatus == 1) ? 0 : 1
            })
        }

        public static getName(): string {return "T. Pin 2"}
        public static getRadioName(): string {return "TP2"}
        public static getReading(): number {return TouchPinP2Sensor.pinStatus}
        public static getMinimum(): number {return 0;}
        public static getMaximum(): number {return 1;}
    }


    /**
     * Sensing analog values on the P0 pin.
     * .analogReadPin() returns a value between [0,1024], this is converted to volts.
     * Returns value between [0, 3]
     */
    export class AnalogPinP0Sensor extends Sensor {
        constructor() {super()}
        public static getName(): string {return "A. Pin 0"}
        public static getRadioName(): string {return "AP0"}
        public static getReading(): number {return pins.analogReadPin(AnalogPin.P0) / 340}
        public static getMinimum(): number {return 0;}
        public static getMaximum(): number {return 3;}
    }


    /**
     * Sensing analog values on the P1 pin.
     * .analogReadPin() returns a value between [0,1024], this is converted to volts.
     * Returns value between [0, 3]
     */
    export class AnalogPinP1Sensor extends Sensor {
        constructor() {super()}
        public static getName(): string {return "A. Pin 1"}
        public static getRadioName(): string {return "AP1"}
        public static getReading(): number { return pins.analogReadPin(AnalogPin.P1) / 340}
        public static getMinimum(): number {return 0;}
        public static getMaximum(): number {return 3;}
    }


    /**
     * Sensing the voltage on the P2 pin.
     * .analogReadPin() returns a value between [0,1024], this is converted to volts.
     * Returns value between [0, 3]
     */
    export class AnalogPinP2Sensor extends Sensor {
        constructor() {super()}
        public static getName(): string {return "A. Pin 2"}
        public static getRadioName(): string {return "AP2"}
        public static getReading(): number { return pins.analogReadPin(AnalogPin.P2) / 340}
        public static getMinimum(): number {return 0;}
        public static getMaximum(): number {return 3;}
    }


    /**
     * Micro-tesla reading of the magnet sensor on Dimension.Strength
     * Min = -5000 micro-Teslas
     * Max = 5000 micro-Teslas
     * Min & Max from LSM303AGR has a dynamic range of +-50 Gauss
     * https://www.st.com/en/mems-and-sensors/lsm303agr.html
     */
    export class MagnetSensor extends Sensor {
        constructor() {super()}

        public static getName(): string {return "Magnet"}
        public static getRadioName(): string {return "M"}
        public static getMinimum(): number {return -5000}
        public static getMaximum(): number {return 5000}
        public static getReading(): number {return input.magneticForce(Dimension.Strength)}
    }

    /**
     * Onboard Pitch or Roll sensor
     */
    export class PitchSensor extends Sensor {
        constructor() {super()}

        public static getName(): string {return "Pitch"}
        public static getRadioName(): string {return "P"}
        public static getReading(): number {return input.rotation(Rotation.Pitch)}
        public static getMinimum(): number {return -180;}
        public static getMaximum(): number {return 180;}
    }

    /**
     * Onboard Pitch or Roll sensor
     */
    export class RollSensor extends Sensor {
        constructor() {super()}

        public static getName(): string {return "Roll"}
        public static getRadioName(): string {return "R"}
        public static getReading(): number {return input.rotation(Rotation.Roll)}
        public static getMinimum(): number {return -180;}
        public static getMaximum(): number {return 180;}
    }

    /**
     * Detection of whether of not the Logo has been pressed
     */
    export class LogoPressSensor extends Sensor {
        constructor() {super()}

        public static getName(): string {return "Logo Press"}
        public static getRadioName(): string {return "LP"}
        public static getReading(): number {return input.logoIsPressed() ? 1 : 0}
        public static getMinimum(): number {return 0;}
        public static getMaximum(): number {return 1;}
    }

    /**
     * Sensor for the current Compass Heading
     * Ranged between 0 and 360 degrees.
     */
    export class CompassHeadingSensor extends Sensor {
        constructor() {super()}

        public static getName(): string {return "Compass"}
        public static getRadioName(): string {return "C"}
        public static getReading(): number {return input.compassHeading()}
        public static getMinimum(): number {return 0;}
        public static getMaximum(): number {return 360;}
    }

    /**
     * Sensor for the Microphone
     * Ranged between 0 and 255.
     */
    export class VolumeSensor extends Sensor {
        constructor() {super()}

        public static getName(): string {return "Microphone"}
        public static getRadioName(): string {return "V"}
        public static getReading(): number {return input.soundLevel()}
        public static getMinimum(): number {return 0;}
        public static getMaximum(): number {return 255;}
    }

}