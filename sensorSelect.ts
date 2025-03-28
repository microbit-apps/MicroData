namespace microdata {
    import Screen = user_interface_base.Screen
    import GridNavigator = user_interface_base.GridNavigator
    import CursorSceneEnum = user_interface_base.CursorSceneEnum
    import CursorSceneWithPriorPage = user_interface_base.CursorSceneWithPriorPage
    import Button = user_interface_base.Button
    import ButtonStyles = user_interface_base.ButtonStyles
    import AppInterface = user_interface_base.AppInterface

    /** 
     * Limit to how many sensors you may record from & read from at once. Neccessary to prevent egregious lag in live-data-viewer.
     * Inclusively, only one Jacdac sensor may be selected at once.
     */
    export const MAX_NUMBER_OF_SENSORS: number = 3
    
    /** 
     * Starting index of contigious row of Jacdac sensors.
     * Used to ensure that Jacdac sensors are appropriately enabled/disabled.
     */
    const START_OF_JACDAC_BUTTONS_INDEX: number = 14

    /**
     * Responsible for allowing the user to select sensors to record or view live readings from.
     *      The user may select up to 5 sensors to read from simultaneously including 1 Jacdac sensor.
     *      These sensors are passed to either the measurement screen or the live data view
     */
    export class SensorSelect extends CursorSceneWithPriorPage {
        private btns: Button[][]
        private selectedSensorAriaIDs: string[]
        private nextSceneEnum: CursorSceneEnum
        private jacdacSensorSelected: boolean
        
        constructor(app: AppInterface, nextSceneEnum: CursorSceneEnum) {
            super(app, function () {
                this.app.popScene(); 
                this.app.pushScene(new Home(this.app))
            }, new GridNavigator()); 
            
            this.btns = [[], [], [], []]; // For our 4x5 grid
            this.selectedSensorAriaIDs = [];
            this.nextSceneEnum = nextSceneEnum;
            this.jacdacSensorSelected = false;
        }

        /* override */ startup() {
            super.startup()

            this.cursor.resetOutlineColourOnMove = true
            const icons: string[] = [
                "accelerometer", "accelerometer", "accelerometer", "right_turn", "right_spin", "pin_0", "pin_1", "pin_2",
                "led_light_sensor", "thermometer", "magnet", "finger_press", "microphone", "compass", "microbitLogoWhiteBackground",
                "microbitLogoWhiteBackground", "microbitLogoWhiteBackground", "microbitLogoWhiteBackground", "microbitLogoWhiteBackground"
            ]

            const ariaIDs: string[] = [
                "Accelerometer X", "Accelerometer Y", "Accelerometer Z", "Pitch", "Roll", "Analog Pin 0", "Analog Pin 1", "Analog Pin 2", "Light",
                "Temperature", "Magnet", "Logo Press", "Microphone", "Compass", "Jacdac Flex", "Jacdac Temperature", "Jacdac Light",
                "Jacdac Moisture", "Jacdac Distance"
            ]

            //-----------------------------------------------------
            // Organise buttons in 4x5 grid: same as GridNavigator:
            //-----------------------------------------------------

            let x: number = -60;
            let y: number = -41
            let iconIndex: number = 0;

            const rowLengths = [5,5,5,4] // Last row has 'Done' button added after this loop:
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < rowLengths[i]; j++) {
                    this.btns[i][j] = new Button({
                        parent: null,
                        style: ButtonStyles.Transparent,
                        icon: icons[iconIndex],
                        ariaId: ariaIDs[iconIndex],
                        x: x,
                        y: y,
                        onClick: (button: Button) => {
                            // Deletion:
                            const index = this.selectedSensorAriaIDs.indexOf(button.ariaId)
                            if (index != -1) {
                                this.cursor.setOutlineColour()
                                this.selectedSensorAriaIDs.splice(index, 1)

                                if (Sensor.getFromName(button.ariaId).isJacdac()) {
                                    this.jacdacSensorSelected = false
                                    this.setOtherJacdacButtonsTo(true)
                                }

                                // Renable all except the Jacdac buttons:
                                let currentIndex = 0;
                                for (let i = 0; i < this.btns.length; i++) {
                                    for (let j = 0; j < rowLengths[i]; j++) {
                                        if (currentIndex >= START_OF_JACDAC_BUTTONS_INDEX)
                                            break
                                        this.btns[i][j].pressable = true
                                        currentIndex++;
                                    }
                                }
                            }

                            // Addition:
                            else if (this.selectedSensorAriaIDs.length < MAX_NUMBER_OF_SENSORS) {
                                this.cursor.setOutlineColour(7)

                                if (Sensor.getFromName(button.ariaId).isJacdac()) {
                                    if (!this.jacdacSensorSelected) {
                                        this.selectedSensorAriaIDs.push(button.ariaId)
                                        this.jacdacSensorSelected = true

                                        this.setOtherJacdacButtonsTo(false, button)
                                    }
                                }
            
                                else {
                                    this.selectedSensorAriaIDs.push(button.ariaId)
                                    button.pressable = true
                                }
                            }

                            // Prevention:
                            if (this.selectedSensorAriaIDs.length >= MAX_NUMBER_OF_SENSORS) {
                                for (let i = 0; i < this.btns.length; i++) {
                                    for (let j = 0; j < rowLengths[i]; j++) {
                                        let buttonInUse = false
                                        for (let k = 0; k < this.selectedSensorAriaIDs.length; k++) {
                                            if (this.btns[i][j].ariaId == this.selectedSensorAriaIDs[k]) {
                                                buttonInUse = true
                                                break
                                            }
                                        }

                                        if (!buttonInUse)
                                            this.btns[i][j].pressable = false
                                    }
                                }
                            }
                        },          
                        dynamicBoundaryColorsOn: true,
                    })

                    x += 30
                    if (x > 60) {
                        x = -60
                        y += Screen.HEIGHT * 0.21875 // 28 on 128 pixel high Arcade Shield
                    }

                    iconIndex++;
                }
            }

            this.btns[3].push(new Button({
                parent: null,
                style: ButtonStyles.Transparent,
                icon: "green_tick",
                ariaId: "Done",
                x,
                y,
                onClick: () => {
                    if (this.selectedSensorAriaIDs.length === 0) {
                        return
                    }
                    const sensors = this.selectedSensorAriaIDs.map((ariaID) => Sensor.getFromName(ariaID))

                    this.app.popScene()
                    if (this.nextSceneEnum === CursorSceneEnum.LiveDataViewer) {
                        this.app.pushScene(new LiveDataViewer(this.app, sensors))
                    }
                    
                    else if (this.nextSceneEnum === CursorSceneEnum.RecordingConfigSelect)
                        this.app.pushScene(new RecordingConfigSelection(this.app, sensors))

                    else if (this.nextSceneEnum === CursorSceneEnum.DistributedLogging)
                        this.app.pushScene(new RecordingConfigSelection(this.app, sensors, CursorSceneEnum.DistributedLogging))
                }
            }))


            this.navigator.setBtns(this.btns)
        }

        /**
         * Modify the mutability of all of the Jacdac buttons at once.
         * Neccessary since only one Jacdac sensor should be selected at once.
         * @param pressableStatus to set all Jacdac buttons to.
         * @param buttonToIgnore Optional case that ignores the pressableStatus
         */
        private setOtherJacdacButtonsTo(pressableStatus: boolean, buttonToIgnore?: Button) {
            let currentIndex = 0;

            for (let i = 0; i < this.btns.length; i++) {
                for (let j = 0; j < this.btns[0].length; j++) {
                    if (currentIndex >= START_OF_JACDAC_BUTTONS_INDEX && currentIndex != (4 * 5) - 1) // Don't touch the last button ('Done')
                        this.btns[i][j].pressable = pressableStatus
                    currentIndex++;
                }
            }

            if (buttonToIgnore)
                buttonToIgnore.pressable = !pressableStatus
        }

        draw() {
            Screen.fillRect(
                Screen.LEFT_EDGE,
                Screen.TOP_EDGE,
                Screen.WIDTH,
                Screen.HEIGHT,
                0xc
            )

            this.navigator.drawComponents();
            super.draw() 
        }
    }
}