namespace microdata {
   /**
     * See modules.lightLevel1.lightLevel sensor from pxt-jacdac/jacdac-light-level.
     * Overrides .isJacdac()
     */
    export class JacdacLightSensor extends Sensor {
        constructor() {
            super({
                name: "Jac Light",
                rName: "JL",
                f: () => modules.lightLevel1.isConnected() ? modules.lightLevel1.lightLevel() : undefined,
                min: 0,
                max: 100,
                isJacdacSensor: true
            });
            modules.lightLevel1.start();
        }
    }

    /**
     * See modules.distance1.distance sensor from pxt-jacdac/jacdac-distance.
     * Overrides .isJacdac()
     */
    export class JacdacDistanceSensor extends Sensor {
        constructor() {
            super({
                name: "Jac Dist",
                rName: "JD",
                f: () => modules.distance1.isConnected() ? modules.distance1.distance() : undefined,
                min: 0,
                max: 100,
                isJacdacSensor: true
            });
            modules.distance1.start();
        }
    }

    /**
     * See modules.soilMoisture1.moisture sensor from pxt-jacdac/jacdac-soil-moisture.
     * Overrides .isJacdac()
     */
    export class JacdacSoilMoistureSensor extends Sensor {
        constructor() {
            super({
                name: "Jac Moist",
                rName: "JM",
                f: () => modules.soilMoisture1.isConnected() ? modules.soilMoisture1.moisture() : undefined,
                min: 0,
                max: 100,
                isJacdacSensor: true
            });
            modules.soilMoisture1.start();
        }
    }

    /**
     * See modules.flex1.bending sensor from pxt-jacdac/flex.
     * Overrides .isJacdac()
     */
    export class JacdacFlexSensor extends Sensor {
        constructor() {
            super({
                name: "Jac Flex",
                rName: "JF",
                f: () => modules.flex1.isConnected() ? modules.flex1.bending() : undefined,
                min: 0,
                max: 100, // Assuming bending level ranges from 0 to 100 (adjust as needed)
                isJacdacSensor: true
            });
            modules.flex1.start();
        }
    }

    /**
     * See modules.temperature1.temperature sensor from pxt-jacdac/temperature.
     * Overrides .isJacdac()
     */
    export class JacdacTemperatureSensor extends Sensor {
        constructor() {
            super({
                name: "Jac Temp",
                rName: "JT",
                f: () => modules.temperature1.isConnected() ? modules.temperature1.temperature() : undefined,
                min: 0,
                max: 100,
                isJacdacSensor: true
            });
            modules.temperature1.start();
        }
    }
}