namespace microdata {
    // Auto-save slot
    export const SAVESLOT_AUTO = "sa"

    export interface SavedState {
        progdef: any
        version?: string
    }

    /**
     * If an Arcade Shield is not present when starting MicroData that Microbit will enter DistributedLoggingProtocol.
     *      It will show a :) on its LEDs and try to become a Target - where it will receive radio commands from a Commander Microbit (one with an Arcade Shield)
     */
    export class App {
        sceneManager: SceneManager 

        constructor() {
            // One interval delay to ensure all static constructors have executed.
            basic.pause(10)
            reportEvent("app.start")

            this.sceneManager = new SceneManager()
            datalogger.includeTimestamp(FlashLogTimeStampFormat.None)

            if (shieldhelpers.shieldPresent())
                this.pushScene(new Home(this))
            else
                new DistributedLoggingProtocol(this, false);
        }

        public pushScene(scene: Scene) {
            this.sceneManager.pushScene(scene)
        }

        public popScene() {
            this.sceneManager.popScene()
        }
    }
}
