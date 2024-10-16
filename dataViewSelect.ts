namespace microdata {
    import Screen = user_interface_base.Screen
    import CursorSceneWithPriorPage = user_interface_base.CursorSceneWithPriorPage
    import CursorSceneEnum = user_interface_base.CursorSceneEnum
    import Button = user_interface_base.Button
    import ButtonStyles = user_interface_base.ButtonStyles
    import AppInterface = user_interface_base.AppInterface

    /**
     * Choose between:
     *      Resetting Datalogger
     *      A tabular view of the recorded data
     *      A graph of the recorded data
     */
    export class DataViewSelect extends CursorSceneWithPriorPage {
        private resetDataLoggerBtn: Button
        private dataViewBtn: Button
        private graphViewBtn: Button
        private dataloggerEmpty: boolean

        constructor(app: AppInterface) { 
            super(app,
                function () {
                this.app.popScene(); 
                this.app.pushScene(new Home(this.app))
            })
        }

        /* override */ startup() {
            super.startup()

            // Includes the header:
            this.dataloggerEmpty = datalogger.getNumberOfRows() <= 1
            
            //---------
            // Control:
            //---------

            // No data in log (first row are headers)
            if (this.dataloggerEmpty) {
                control.onEvent(
                    ControllerButtonEvent.Pressed,
                    controller.A.id,
                    () => {
                        this.app.popScene()
                        this.app.pushScene(new SensorSelect(this.app, CursorSceneEnum.RecordingConfigSelect))
                    }
                )
            }

            const y = Screen.HEIGHT * 0.234 // y = 30 on an Arcade Shield of height 128 pixels

            this.dataViewBtn = new Button({
                parent: null,
                style: ButtonStyles.Transparent,
                icon: "largeDisk",
                ariaId: "View Data",
                x: -50,
                y,
                onClick: () => {
                    this.app.popScene()
                    this.app.pushScene(new TabularDataViewer(this.app, function () {this.app.popScene(); this.app.pushScene(new DataViewSelect(this.app))}))
                },
            })

            this.graphViewBtn = new Button({
                parent: null,
                style: ButtonStyles.Transparent,
                icon: "linear_graph_1",
                ariaId: "View Graph",
                x: 0,
                y,
                onClick: () => {
                    this.app.popScene()
                    this.app.pushScene(new GraphGenerator(this.app))
                },
            })

            this.resetDataLoggerBtn = new Button({
                parent: null,
                style: ButtonStyles.Transparent,
                icon: "largeSettingsGear",
                ariaId: "Reset Datalogger",
                x: 50,
                y,
                onClick: () => {
                    datalogger.deleteLog()
                    this.dataloggerEmpty = true
                    
                    control.onEvent(
                        ControllerButtonEvent.Pressed,
                        controller.A.id,
                        () => {
                            this.app.popScene()
                            this.app.pushScene(new SensorSelect(this.app, CursorSceneEnum.RecordingConfigSelect))
                        }
                    )
                },
            })

            this.navigator.addButtons([this.dataViewBtn, this.graphViewBtn, this.resetDataLoggerBtn])
        }

        draw() {
            Screen.fillRect(
                Screen.LEFT_EDGE,
                Screen.TOP_EDGE,
                Screen.WIDTH,
                Screen.HEIGHT,
                0xC
            )

            if (this.dataloggerEmpty) {
                screen().printCenter("No data has been recorded", 5)
                screen().printCenter("Press A to Record some!", Screen.HALF_HEIGHT)
                return;
            }

            else {
                screen().printCenter("Recorded Data Options", 5)
                this.resetDataLoggerBtn.draw()
                this.dataViewBtn.draw()
                this.graphViewBtn.draw()
            }

            super.draw()
        }
    }
}