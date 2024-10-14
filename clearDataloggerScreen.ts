namespace microdata {
    /**
     * Grant the user the option to clear the contents stored on the data logger.
     * Inbetween Home and SensorSelect
     */
    export class ClearDataLoggerScreen extends Scene {
        private yesBtn: Sprite // currentBtn = 0
        private noBtn: Sprite // currentBtn = 1
        private currentlyDeleting: boolean
        
        constructor(app: App) {
            super(app, "clearDataLogger")
            this.currentlyDeleting = false

            // Data logger already empty:
            if (datalogger.getNumberOfRows(0) <= 1) {
                this.app.popScene()
                this.app.pushScene(new SensorSelect(this.app, CursorSceneEnum.RecordingConfigSelect))
            }

            this.yesBtn = new Sprite({img: icons.get("tile_button_a")})
                this.yesBtn.bindXfrm(new Affine())
                this.yesBtn.xfrm.parent = new Affine()
                this.yesBtn.xfrm.worldPos.x = Screen.HALF_WIDTH
                this.yesBtn.xfrm.worldPos.y = Screen.HALF_HEIGHT
                this.yesBtn.xfrm.localPos.x = -39
                this.yesBtn.xfrm.localPos.y = 20

            this.noBtn = new Sprite({img: icons.get("tile_button_b")})
                this.noBtn.bindXfrm(new Affine())
                this.noBtn.xfrm.parent = new Affine()
                this.noBtn.xfrm.worldPos.x = Screen.HALF_WIDTH
                this.noBtn.xfrm.worldPos.y = Screen.HALF_HEIGHT
                this.noBtn.xfrm.localPos.x = 38
                this.noBtn.xfrm.localPos.y = 20
        }

        /* override */ startup() {
            super.startup()

            this.unbindButtons()

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.A.id,
                () => {
                    this.unbindButtons()

                    this.currentlyDeleting = true
                    datalogger.deleteLog(datalogger.DeleteType.Fast)

                    this.app.popScene()
                    this.app.pushScene(new SensorSelect(this.app, CursorSceneEnum.RecordingConfigSelect))
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.B.id,
                () => {
                    this.app.popScene()
                    this.app.pushScene(new SensorSelect(this.app, CursorSceneEnum.RecordingConfigSelect))
                }
            )
        }


        /**
         * Ensure that the previous functions that the buttons were bound to cannot be invoked.
         * Invocations to other functions can be particularly prone to crashing if during datalogger.deleteLog()
         */
        private unbindButtons() {
            control.onEvent(ControllerButtonEvent.Pressed, controller.A.id, () => {})
            control.onEvent(ControllerButtonEvent.Pressed, controller.B.id, () => {})
            control.onEvent(ControllerButtonEvent.Pressed, controller.left.id, () => {})
            control.onEvent(ControllerButtonEvent.Pressed, controller.right.id, () => {})
            control.onEvent(ControllerButtonEvent.Pressed, controller.up.id, () => {})
            control.onEvent(ControllerButtonEvent.Pressed, controller.down.id, () => {})
        }

        draw() {
            Screen.fillRect(
                Screen.LEFT_EDGE,
                Screen.TOP_EDGE,
                Screen.WIDTH,
                Screen.HEIGHT,
                0xc
            )

            screen().printCenter("Sensor Selection", 4)
            const headerX = Screen.HALF_WIDTH // Log has data in it

            // Outline:
            screen().fillRect(
                Screen.HALF_WIDTH - 70, 
                Screen.HALF_HEIGHT - 40,
                140,
                90,
                15 // Black
            )

            screen().fillRect(
                Screen.HALF_WIDTH - 70 + 3,
                Screen.HALF_HEIGHT - 40 + 3,
                140 - 6,
                90 - 6,
                4 // Orange
            ) 

            const tutorialTextLength = ("Clear the data log?".length * font.charWidth)
            screen().print(
                "Clear the data log?",
                headerX - (tutorialTextLength / 2),
                Screen.HALF_HEIGHT - 40 + 7,
                15 // Black
            )
            
            // Underline the title:
            screen().fillRect(
                headerX - (tutorialTextLength / 2) + 2,
                Screen.HALF_HEIGHT - 40 + 25,
                tutorialTextLength - (1 * font.charWidth),
                2,
                15 // Black
            )

            if (this.currentlyDeleting)
                screen().printCenter("Deleting data...", Screen.HALF_HEIGHT - 9, 15)

            // Draw button prompts:
            screen().print(
                "Yes",
                Screen.HALF_WIDTH - 48,
                Screen.HALF_HEIGHT + 28,
                15
            )

            screen().print(
                "No",
                Screen.HALF_WIDTH + 33,
                Screen.HALF_HEIGHT + 28,
                15
            )

            // White boxes behind yes & no btns:
            screen().fillRect(
                Screen.HALF_WIDTH - 47,
                Screen.HALF_HEIGHT + 14,
                12,
                12,
                1
            )

            screen().fillRect(
                Screen.HALF_WIDTH + 34,
                Screen.HALF_HEIGHT + 14,
                12,
                12,
                1
            )

            this.yesBtn.draw()
            this.noBtn.draw()

            super.draw() 
        }
    }
}