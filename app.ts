namespace microdata {
    import AppInterface = user_interface_base.AppInterface
    import Scene = user_interface_base.Scene
    import SceneManager = user_interface_base.SceneManager
    import Screen = user_interface_base.Screen

    // Auto-save slot
    export const SAVESLOT_AUTO = "sa"

    export interface SavedState {
        progdef: any
        version?: string
    }

    // application configuration
    user_interface_base.getIcon = (id) => icons.get(id)
    user_interface_base.resolveTooltip = (ariaId: string) => ariaId

    /**
     * If an Arcade Shield is not present when starting MicroData that Microbit will enter DistributedLoggingProtocol.
     *      It will show a :) on its LEDs and try to become a Target - where it will receive radio commands from a Commander Microbit (one with an Arcade Shield)
     */
    export class App implements AppInterface {
        sceneManager: SceneManager

        constructor() {
            // One interval delay to ensure all static constructors have executed.
            basic.pause(10)
            reportEvent("app.start")

            radio.setGroup(5)
            // radio.setTransmitPower(7)
            // radio.setFrequencyBand(14)

            this.handshake();
            sendAllAssetsOverRadio();

            this.sceneManager = new SceneManager()
            datalogger.includeTimestamp(FlashLogTimeStampFormat.None)

            // const arcadeShieldConnected = shieldhelpers.shieldPresent();
            // if (arcadeShieldConnected)

            // this.pushScene(new microdata.Home(this));
            //     else
            //         new DistributedLoggingProtocol(this, false);
            // else
            // new DistributedLoggingProtocol(this, false);


            const imgs = [
                "led_light_sensor",
                "thermometer",
                "accelerometer",
                "finger_press",
                "green_tick",
                "magnet",
                "pin_0",
                "pin_1",
                "pin_2",
            ];


            let pauseLoop = false;

            let i = 0;
            while (true) {
                if (!pauseLoop) {
                    basic.showNumber(i % 10)
                    Screen.fill(i % 16)

                    const img = icons.get(imgs[i % imgs.length])
                    Screen.drawTransparentImage(
                        img,
                        (screen().width >> 1) - (img.width >> 1),
                        (screen().height >> 1) - (img.height >> 1)
                    )

                    i++;
                } else {
                    Screen.fill(1)
                    basic.pause(3000)
                    pauseLoop = false;
                }
            }
        }

        handshake() {
            let handshakeRecieved = false;
            radio.onReceivedString((_: string) => {
                handshakeRecieved = true;
                radio.sendString("ACK")
            })

            radio.sendString("HANDSHAKE");
            // let handshakeTimeout = 0;
            while (!handshakeRecieved) {
                // if (handshakeTimeout == 0) {
                // }

                // handshakeTimeout += 3;
                basic.pause(3)

                // if (handshakeTimeout >= 99) {
                //     handshakeTimeout = 0;
                // }
            }
            radio.onReceivedString((_: string) => { })
        }

        public pushScene(scene: Scene) {
            this.sceneManager.pushScene(scene)
        }

        public popScene() {
            this.sceneManager.popScene()
        }

        public save(slot: string, buffer: Buffer): boolean {
            return true;
        }

        public load(slot: string): Buffer {
            return Buffer.create(0);
        }
    }
}
