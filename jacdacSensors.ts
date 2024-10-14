namespace microdata {
    /**
     * See modules.lightLevel1.lightLevel sensor from pxt-jacdac/jacdac-light-level.
     * Overrides .isJacdac()
     */
    export class JacdacLightSensor extends Sensor {
        constructor() {super(); modules.lightLevel1.start()}

        public static getName(): string {return "Jac Light"}
        public static getRadioName(): string {return "JL"}
        public static getReading(): number {return modules.lightLevel1.isConnected() ? modules.lightLevel1.lightLevel() : undefined}
        public static isJacdac(): boolean {return true;}
    }

    /**
     * See modules.distance1.distance sensor from pxt-jacdac/jacdac-distance.
     * Overrides .isJacdac()
     */
    export class JacdacDistanceSensor extends Sensor {
        constructor() {super(); modules.distance1.start()}

        public static getName(): string {return "Jac Dist"}
        public static getRadioName(): string {return "JD"}
        public static getReading(): number {return modules.distance1.isConnected() ? modules.distance1.distance() : undefined}
        public static isJacdac(): boolean {return true;}
    }

    /**
     * See modules.soilMoisture1.moisture sensor from pxt-jacdac/jacdac-soil-moisture.
     * Overrides .isJacdac()
     */
    export class JacdacSoilMoistureSensor extends Sensor {
        constructor() {super(); modules.soilMoisture1.start()
        }

        public static getName(): string {return "Jac Moist"}
        public static getRadioName(): string {return "JM"}
        public static getReading(): number {return modules.soilMoisture1.isConnected() ? modules.soilMoisture1.moisture() : undefined}
        public static isJacdac(): boolean {return true;}
    }

    /**
     * See modules.flex1.bending sensor from pxt-jacdac/flex.
     * Overrides .isJacdac()
     */
    export class JacdacFlexSensor extends Sensor {
        constructor() {super(); modules.flex1.start()}

        public static getName(): string {return "Jac Flex"}
        public static getRadioName(): string {return "JF"}
        public static getReading(): number {return modules.flex1.isConnected() ? modules.flex1.bending() : undefined}
        public static isJacdac(): boolean {return true;}
    }

    /**
     * See modules.temperature1.temperature sensor from pxt-jacdac/temperature.
     * Overrides .isJacdac()
     */
    export class JacdacTemperatureSensor extends Sensor {
        constructor() {super(); modules.temperature1.start()}

        public static getName(): string {return "Jac Temp"}
        public static getRadioName(): string {return "JT"}
        public static getReading(): number {return modules.temperature1.isConnected() ? modules.temperature1.temperature() : undefined}
        public static isJacdac(): boolean {return true;}
    }
}