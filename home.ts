namespace microdata {
    import Screen = user_interface_base.Screen
    import CursorScene = user_interface_base.CursorScene
    import Button = user_interface_base.Button
    import ButtonStyles = user_interface_base.ButtonStyles
    import AppInterface = user_interface_base.AppInterface
    import CursorSceneEnum = user_interface_base.CursorSceneEnum
    import font = user_interface_base.font

    export class Home extends CursorScene {
        private liveDataBtn: Button
        private recordDataBtn: Button
        private distributedLoggingBtn: Button
        private viewBtn: Button

        constructor(app: AppInterface) {
            super(app)
        }

        /* override */ startup() {
            super.startup()

            const y = 25

            this.liveDataBtn = new Button({
                parent: null,
                style: ButtonStyles.Transparent,
                icon: "linear_graph_1",
                ariaId: "Real-time Data",
                x: -58,
                y,
                onClick: () => {
                    this.app.popScene()
                    this.app.pushScene(new SensorSelect(this.app, CursorSceneEnum.LiveDataViewer))
                },
            })

            this.recordDataBtn = new Button({
                parent: null,
                style: ButtonStyles.Transparent,
                icon: "edit_program",
                ariaId: "Log Data",
                x: -20,
                y,
                onClick: () => {
                    this.app.popScene()
                    this.app.pushScene(new SensorSelect(this.app, CursorSceneEnum.RecordingConfigSelect))
                },
            })

            this.distributedLoggingBtn = new Button({
                parent: null,
                style: ButtonStyles.Transparent,
                icon: "radio_set_group",
                ariaId: "Command Mode",
                x: 20,
                y,
                onClick: () => {
                    this.app.popScene()
                    this.app.pushScene(new DistributedLoggingScreen(this.app)) // Temp disabled elements relating to callbackObj (no mem)
                },
            })

            this.viewBtn = new Button({
                parent: null,
                style: ButtonStyles.Transparent,
                icon: "largeDisk",
                ariaId: "View Data",
                x: 58,
                y,
                onClick: () => {
                    this.app.popScene()
                    this.app.pushScene(new DataViewSelect(this.app))
                },
            })

            const btns: Button[] = [this.liveDataBtn, this.recordDataBtn, this.distributedLoggingBtn, this.viewBtn]
            this.navigator.setBtns([btns])
        }

        private drawVersion() {
            const font = bitmaps.font5
            Screen.print(
                "v1.6.0",
                Screen.RIGHT_EDGE - font.charWidth * "v1.6.0".length,
                Screen.BOTTOM_EDGE - font.charHeight - 2,
                0xb,
                font
            )
        }

        private yOffset = -Screen.HEIGHT >> 1
        draw() {
            Screen.fillRect(
                Screen.LEFT_EDGE,
                Screen.TOP_EDGE,
                Screen.WIDTH,
                Screen.HEIGHT,
                0xc
            )

            this.yOffset = Math.min(0, this.yOffset + 2)
            const t = control.millis()
            const dy = this.yOffset == 0 ? (Math.idiv(t, 800) & 1) - 1 : 0
            const margin = 2
            const OFFSET = (Screen.HEIGHT >> 1) - wordLogo.height - margin - 9
            const y = Screen.TOP_EDGE + OFFSET //+ dy
            Screen.drawTransparentImage(
                wordLogo,
                Screen.LEFT_EDGE + ((Screen.WIDTH - wordLogo.width) >> 1)// + dy
                ,
                y + this.yOffset
            )
            Screen.drawTransparentImage(
                microbitLogo,
                Screen.LEFT_EDGE +
                ((Screen.WIDTH - microbitLogo.width) >> 1) + dy
                ,
                y - wordLogo.height + this.yOffset + margin
            )

            if (!this.yOffset) {
                Screen.print(
                    "Mini-measurer",
                    Screen.LEFT_EDGE +
                    ((Screen.WIDTH + wordLogo.width) >> 1)
                    + dy
                    -
                    font.charWidth * "Mini-measurer".length,
                    Screen.TOP_EDGE +
                    OFFSET +
                    wordLogo.height +
                    dy +
                    this.yOffset +
                    3,
                    0xb,
                    font
                )
            }

            this.liveDataBtn.draw()
            this.recordDataBtn.draw()
            this.distributedLoggingBtn.draw()
            this.viewBtn.draw()

            this.drawVersion()
            super.draw()
        }
    }
}
