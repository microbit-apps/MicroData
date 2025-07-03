
namespace microdata {
    import Screen = user_interface_base.Screen
    import Scene = user_interface_base.Scene
    import CursorSceneWithPriorPage = user_interface_base.CursorSceneWithPriorPage
    import Button = user_interface_base.Button
    import ButtonStyles = user_interface_base.ButtonStyles
    import AppInterface = user_interface_base.AppInterface
    import CursorSceneEnum = user_interface_base.CursorSceneEnum
    import font = user_interface_base.font
    import Bounds = user_interface_base.Bounds

    const enum GUI_STATE {
        CHANGING_NUMBER_OF_MEASUREMENTS,
        CHANGING_PERIOD_SECONDS
    }

    export class BasicLoggingScene extends Scene {
        private guiState: GUI_STATE = GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS;
        private numberOfMeasurements: number = 10;
        private periodSeconds: number = 1;

        constructor(app: AppInterface) {
            super(app)
        }

        /* override */ startup() {
            super.startup()
            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.right.id,
                () => {
                    this.guiState =
                    (this.guiState == GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS) ?
                        this.guiState = GUI_STATE.CHANGING_PERIOD_SECONDS :
                        this.guiState = GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.left.id,
                () => {
                    this.guiState =
                    (this.guiState == GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS) ?
                        this.guiState = GUI_STATE.CHANGING_PERIOD_SECONDS :
                        this.guiState = GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.up.id,
                () => {
                    let tick = true;
                    control.onEvent(
                        ControllerButtonEvent.Released,
                        controller.up.id,
                        () => tick = false
                    )

                    // Control logic:
                    while (tick) {
                        if (this.guiState == GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS)
                            this.numberOfMeasurements += 1
                        else
                            this.periodSeconds += 1
                        basic.pause(100)
                    }
                    // Reset binding
                    control.onEvent(ControllerButtonEvent.Released, controller.up.id, () => { })
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.down.id,
                () => {
                    let tick = true;
                    control.onEvent(
                        ControllerButtonEvent.Released,
                        controller.down.id,
                        () => tick = false
                    )

                    // Control logic:
                    while (tick) {
                        if (this.guiState == GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS)
                            this.numberOfMeasurements = Math.max(1, this.numberOfMeasurements - 1)
                        else
                            this.periodSeconds = Math.max(1, this.periodSeconds - 1)
                        basic.pause(100)
                    }
                    // Reset binding
                    control.onEvent(ControllerButtonEvent.Released, controller.down.id, () => { })
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.A.id,
                () => {
                    
                    basic.showLeds(`
                        . . . . .
                        . # . # .
                        . . . . .
                        # . . . #
                        . # # # .
                    `)
                }
            )
        }

        draw() {
            screen().fill(12);

            const textFont = bitmaps.font12;
            const textXOffset = 30;
            const numberOfMeasurementsCenteringOffset =
                ((this.numberOfMeasurements.toString().length * textFont.charWidth) >> 1);
            const periodCenteringOffset =
                ((this.periodSeconds.toString().length * textFont.charWidth) >> 1);

            const triangleWidth = 22;

            const sensorName = "Accel. X"
            screen().fillRect(
                (screen().width >> 1) - ((sensorName.length * font.charWidth) >> 1) + 2,
                5 + 2,
                (sensorName.length * font.charWidth) + 6 + 1,
                font.charHeight + 3 + 1,
                15
            )

            screen().fillRect(
                (screen().width >> 1) - ((sensorName.length * font.charWidth) >> 1),
                5,
                (sensorName.length * font.charWidth) + 6,
                font.charHeight + 3,
                6
            )

            screen().fillRect(
                textXOffset - numberOfMeasurementsCenteringOffset - 3,
                (screen().height >> 1) - (textFont.charHeight >> 1) + 1,
                (numberOfMeasurementsCenteringOffset * 2) + 2,
                textFont.charHeight + 3,
                15
            )

            screen().fillRect(
                textXOffset - numberOfMeasurementsCenteringOffset - 4,
                (screen().height >> 1) - (textFont.charHeight >> 1),
                (numberOfMeasurementsCenteringOffset * 2) + 1,
                textFont.charHeight + 2,
                4
            )

            screen().fillRect(
                screen().width - textXOffset - periodCenteringOffset - 3,
                (screen().height >> 1) - (textFont.charHeight >> 1) + 1,
                (periodCenteringOffset * 2) + 2,
                textFont.charHeight + 3,
                15
            )

            screen().fillRect(
                screen().width - textXOffset - periodCenteringOffset - 4,
                (screen().height >> 1) - (textFont.charHeight >> 1),
                (periodCenteringOffset * 2) + 1,
                textFont.charHeight + 2,
                4
            )

            for (let i = 0; i < 2; i++) { // Embolden
                screen().print(
                    sensorName,
                    (screen().width >> 1) - ((sensorName.length * font.charWidth) >> 1) + 4 + i,
                    5 + 2,
                    15
                )

                screen().print(
                    "" + this.numberOfMeasurements,
                    textXOffset - i - numberOfMeasurementsCenteringOffset,
                    (screen().height >> 1) - (textFont.charHeight >> 1),
                    15,
                    textFont
                )

                screen().print(
                    "" + this.periodSeconds,
                    screen().width - textXOffset - i - periodCenteringOffset,
                    (screen().height >> 1) - (textFont.charHeight >> 1),
                    15,
                    textFont
                )
            }

            let xOffset = 
                (this.guiState == GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS) ?
                    screen().width - 30: (screen().width >> 1);

            screen().fillRect(
                xOffset - (screen().width >> 1)  + 2,
                25 - 1,
                (screen().width >> 1) + 24,
                screen().height - 40,
                15
            )

            screen().fillRect(
                xOffset - (screen().width >> 1) + 4,
                25 + 1,
                (screen().width >> 1) + 24 - 5,
                screen().height - 40 - 5,
                6
            )

            screen().fillRect(
                xOffset - (screen().width >> 1) + 6,
                25 + 6,
                3,
                3,
                15
            )

            const tips = (this.guiState == GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS) ?
                ["Use Up and Down\nto change the\nnumber of\nmeasurements.",
                 "Press Right to\nprogress."] :
                ["Use Up and Down\nto change the\nseconds between\nmeasurements.",
                 "Press A when\nyou're done."];

            screen().print(
                tips[0],
                xOffset - (screen().width >> 1) + 10,
                25 + 4,
                15
            )

            screen().fillRect(
                xOffset - (screen().width >> 1) + 6,
                75 + 6,
                3,
                3,
                15
            )

            screen().print(
                tips[1],
                xOffset - (screen().width >> 1) + 10,
                75 + 4,
                15
            )
        }
    }

    export class LoggingModeSelection extends CursorSceneWithPriorPage {
        constructor(app: AppInterface) {
            super(app, () => {this.app.popScene(); this.app.pushScene(new Home(this.app))})
        }

        /* override */ startup() {
            super.startup()

            const y = 36;

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
                        this.app.pushScene(new BasicLoggingScene(this.app))
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
                        "Log when there's a\nsudden change.",
                        "Or when a certain value\n is met."
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

