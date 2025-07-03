namespace microdata {
    import Screen = user_interface_base.Screen
    import CursorScene = user_interface_base.CursorScene
    import Button = user_interface_base.Button
    import ButtonStyles = user_interface_base.ButtonStyles
    import AppInterface = user_interface_base.AppInterface
    import CursorSceneEnum = user_interface_base.CursorSceneEnum
    import font = user_interface_base.font
    import Bounds = user_interface_base.Bounds

    export class LoggingModeSelection extends CursorScene {
        constructor(app: AppInterface) {
            super(app)
        }

        /* override */ startup() {
            super.startup()

            const y = 36

            this.navigator.setBtns([[
                new Button({
                    parent: null,
                    style: ButtonStyles.Transparent,
                    icon: "edit_program",
                    ariaId: "",
                    x: -50,
                    y,
                    onClick: () => {
                        this.app.popScene()
                        this.app.pushScene(new SensorSelect(this.app, CursorSceneEnum.LiveDataViewer))
                    },
                }),

                new Button({
                    parent: null,
                    style: ButtonStyles.Transparent,
                    icon: "largeSettingsGear",
                    ariaId: "",
                    x: 0,
                    y,
                    onClick: () => {
                        this.app.popScene()
                        this.app.pushScene(new SensorSelect(this.app, CursorSceneEnum.RecordingConfigSelect))
                    },
                }),

                new Button({
                    parent: null,
                    style: ButtonStyles.Transparent,
                    icon: "largeDisk",
                    ariaId: "",
                    x: 50,
                    y,
                    onClick: () => {
                        this.app.popScene()
                        this.app.pushScene(new DataViewSelect(this.app))
                    },
                })
            ]])
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

            const tutorialBounds = new Bounds({
                width: Screen.WIDTH - 8,
                height: (Screen.HEIGHT >> 1) + 8,
                left: -(Screen.WIDTH >> 1) + 3,
                top: -(Screen.HEIGHT >> 1) + 2
            });

            const tutorialBoundsShadow = new Bounds({
                width: tutorialBounds.width + 2,
                height: tutorialBounds.height + 2,
                left: tutorialBounds.left,
                top: tutorialBounds.top
            });

            const drawTutorialTips = (title: string, tips: string[]) => {
                tutorialBoundsShadow.fillRect(15)
                tutorialBounds.fillRect(6)

                Screen.print(
                    title,
                    (tutorialBounds.left + (tutorialBounds.width >> 1)) - ((title.length * font.charWidth) >> 1),
                    tutorialBounds.top + 4,
                    15
                )

                const tipsStartY = 15;
                const yDif = (i: number) => 
                    (tips.length == 3) 
                    ? i * (2 * font.charHeight) 
                    : i * ((tutorialBounds.height - 10) / tips.length)

                for (let i = 0; i < tips.length; i++) {
                    Screen.fillRect(
                        tutorialBounds.left + 3,
                        tutorialBounds.top + tipsStartY + yDif(i) + (font.charHeight >> 1),
                        3,
                        3,
                        15
                    )

                    Screen.print(
                        tips[i],
                        tutorialBounds.left + 9,
                        tutorialBounds.top + tipsStartY + yDif(i) + 1,
                        15
                    )
                }
            }

            switch (this.navigator.getCurrent().getIcon()) {
                case "edit_program": {
                    const tips = [
                        "Log at a regular rate.",
                        "Logs are kept on-device.",
                        "Good choice for typical\nexperiments."
                    ];
                    drawTutorialTips("Interval Mode", tips)

                    break;
                };

                case "largeSettingsGear": {
                    const tips = [
                        "Log a sudden change in\nacceleration.",
                        "Or when temperature\nreaches a certain value."
                    ];
                    drawTutorialTips("Event Mode", tips)
                    break;
                };

                case "largeDisk": {
                    const tips = [
                        "Only log when I press\nthe A button.",
                        "Good for experiments\nwith special conditions.",
                    ];
                    drawTutorialTips("Stopwatch Mode", tips)
                    break;
                }

                default: break;
            }
        }
    }
}
