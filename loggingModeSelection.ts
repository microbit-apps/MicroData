
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


    const enum GUI_STATE_QUESTION {
        ASKING_HOW_LONG,
        ASKING_INTERVAL
    }

    const enum GUI_STATE_USER_ANSWER {
        CHANGING_EXPERIMENT_LENGTH,
        CHANGING_EXPERIMENT_LENGTH_UNITS,
        CHANGING_EXPERIMENT_INTERVAL,
        CHANGING_EXPERIMENT_INTERVAL_UNITS
    }

    const EXPERIMENT_UNITS = [
        // "milli-seconds",
        "seconds",
        "minutes",
        "hours",
        "days",
    ]

    const EXPERIMENT_UNITS_CONVERSION_TABLE = {
        // "milli-seconds": 1,
        "seconds": 1000,
        "minutes": 60000,
        "hours": 3600000,
        "days": 86400000
    }


    export class IntervalMode extends Scene {
        private guiStateQuestion: GUI_STATE_QUESTION = GUI_STATE_QUESTION.ASKING_HOW_LONG;
        private guiStateAnswer: GUI_STATE_USER_ANSWER = GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_LENGTH;

        private experimentLength: number = 10;
        private experimentLengthUnitsIndex: number = 0; // "Seconds"

        private experimentInterval: number = 1;
        private experimentIntervalUnitsIndex: number = 0; // "Seconds"

        constructor(app: AppInterface) {
            super(app)
        }

        /* override */ startup(controlSetupFn?: () => {}) {
            super.startup()
            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.right.id,
                () => {
                    if (this.guiStateQuestion == GUI_STATE_QUESTION.ASKING_HOW_LONG) {
                        this.guiStateAnswer =
                            (this.guiStateAnswer == GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_LENGTH) ?
                                this.guiStateAnswer = GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_LENGTH_UNITS :
                                this.guiStateAnswer = GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_LENGTH;
                    } else {
                        this.guiStateAnswer =
                            (this.guiStateAnswer == GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_INTERVAL) ?
                                this.guiStateAnswer = GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_INTERVAL_UNITS :
                                this.guiStateAnswer = GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_INTERVAL;
                    }
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.left.id,
                () => {
                    if (this.guiStateQuestion == GUI_STATE_QUESTION.ASKING_HOW_LONG) {
                        this.guiStateAnswer =
                            (this.guiStateAnswer == GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_LENGTH) ?
                                this.guiStateAnswer = GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_LENGTH_UNITS :
                                this.guiStateAnswer = GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_LENGTH
                    } else {
                        this.guiStateAnswer =
                            (this.guiStateAnswer == GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_INTERVAL) ?
                                this.guiStateAnswer = GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_INTERVAL_UNITS :
                                this.guiStateAnswer = GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_INTERVAL
                    }
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
                        if (this.guiStateQuestion == GUI_STATE_QUESTION.ASKING_HOW_LONG) {
                            if (this.guiStateAnswer == GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_LENGTH) {
                                this.experimentLength += 1;
                            } else {
                                this.experimentLengthUnitsIndex = (this.experimentLengthUnitsIndex + 1) % EXPERIMENT_UNITS.length;
                            }
                        } else {
                            if (this.guiStateAnswer == GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_INTERVAL) {
                                this.experimentInterval += 1;
                            } else {
                                this.experimentIntervalUnitsIndex = (this.experimentIntervalUnitsIndex + 1) % EXPERIMENT_UNITS.length;
                            }
                        }
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
                        if (this.guiStateQuestion == GUI_STATE_QUESTION.ASKING_HOW_LONG) {
                            if (this.guiStateAnswer == GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_LENGTH) {
                                this.experimentLength = Math.max(1, this.experimentLength - 1);
                            } else {
                                const len = EXPERIMENT_UNITS.length;
                                this.experimentLengthUnitsIndex = (((this.experimentLengthUnitsIndex - 1) % len) + len) % len;
                            }
                        } else {
                            if (this.guiStateAnswer == GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_INTERVAL) {
                                this.experimentInterval = Math.max(1, this.experimentInterval - 1);
                            } else {
                                const len = EXPERIMENT_UNITS.length;
                                this.experimentIntervalUnitsIndex = (((this.experimentIntervalUnitsIndex - 1) % len) + len) % len;
                            }
                        }
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
                    if (this.guiStateQuestion == GUI_STATE_QUESTION.ASKING_HOW_LONG) {
                        this.guiStateQuestion = GUI_STATE_QUESTION.ASKING_INTERVAL
                        this.guiStateAnswer = GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_INTERVAL
                    } else {
                        basic.showLeds(`
                            . . . . .
                            . # . # .
                            . . . . .
                            # . . . #
                            . # # # .
                        `)
                    }
                }
            )

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.B.id,
                () => {
                    if (this.guiStateQuestion == GUI_STATE_QUESTION.ASKING_HOW_LONG) {
                        this.app.popScene();
                        this.app.pushScene(new LoggingModeSelection(this.app))
                    } else {
                        this.guiStateQuestion = GUI_STATE_QUESTION.ASKING_HOW_LONG
                        this.guiStateAnswer = GUI_STATE_USER_ANSWER.CHANGING_EXPERIMENT_LENGTH
                    }
                }
            )
        }

        draw() {
            screen().fill(12);

            const textFont = bitmaps.font12;
            const textXOffset = 30;

            const triangleWidth = 22;
            const sensorName = "Accel. X";

            // Sensor name Box:
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
            ) // End of Sensor name Box

            const firstColValue: string =
                (this.guiStateQuestion == GUI_STATE_QUESTION.ASKING_HOW_LONG) ?
                    this.experimentLength.toString() :
                    this.experimentInterval.toString();

            const secondColValue: string =
                (this.guiStateQuestion == GUI_STATE_QUESTION.ASKING_HOW_LONG) ?
                    EXPERIMENT_UNITS[this.experimentLengthUnitsIndex] :
                    EXPERIMENT_UNITS[this.experimentIntervalUnitsIndex];

            const colSpacingValue: string = (firstColValue.length % 2) ? "  " : " ";

            const totalLength = firstColValue.length + colSpacingValue.length + secondColValue.length;
            const xCenteringOffset = (screen().width - (totalLength * textFont.charWidth)) >> 1;

            // First col:
            const firstColBoundaryWidth = ((firstColValue.length + (firstColValue.length % 2)) * textFont.charWidth) + 2;
            screen().fillRect(
                xCenteringOffset - 4,
                (screen().height >> 1) - (textFont.charHeight >> 1) + 1,
                firstColBoundaryWidth,
                textFont.charHeight + 3,
                15
            )

            screen().fillRect(
                xCenteringOffset - 4,
                (screen().height >> 1) - (textFont.charHeight >> 1),
                firstColBoundaryWidth - 1,
                textFont.charHeight + 2,
                4
            ) // End of First col


            // Second col:
            const colSpacingWidth = (colSpacingValue.length * font.charWidth)
            
            const secondColBoundaryWidth = ((secondColValue.length) * textFont.charWidth);
            screen().fillRect(
                xCenteringOffset + firstColBoundaryWidth + colSpacingWidth,
                (screen().height >> 1) - (textFont.charHeight >> 1) + 1,
                secondColBoundaryWidth + 2,
                textFont.charHeight + 3,
                15
            )

            screen().fillRect(
                xCenteringOffset + firstColBoundaryWidth + colSpacingWidth,
                (screen().height >> 1) - (textFont.charHeight >> 1),
                secondColBoundaryWidth + 1,
                textFont.charHeight + 2,
                5
            ) // End of Second col


            for (let i = 0; i < 2; i++) { // Embolden
                screen().print(
                    sensorName,
                    (screen().width >> 1) - ((sensorName.length * font.charWidth) >> 1) + 4 + i,
                    5 + 2,
                    15
                )
            }

            screen().print(
                "" + firstColValue + colSpacingValue  + secondColValue,
                xCenteringOffset + (((firstColValue.length % 2) * textFont.charWidth) >> 1),
                (screen().height >> 1) - (textFont.charHeight >> 1),
                15,
                textFont
            )

            // Question:
            const boxXOffset = 2;
            screen().fillRect(
                boxXOffset,
                22,
                108,
                26,
                15
            )

            screen().fillRect(
                boxXOffset,
                22,
                108,
                26 - 2,
                6
            )

            screen().fillRect(
                boxXOffset + 4,
                27,
                4,
                4,
                1
            ) // Bulletpoint

            const question = 
                (this.guiStateQuestion == GUI_STATE_QUESTION.ASKING_HOW_LONG) ?
                    "How long is\nyour experiment?" :
                    "How long between\nmeasurements?"

            screen().print(
                question,
                boxXOffset + 10,
                25,
            ) // End of Question

            // Tutorial text:
            screen().fillRect(
                boxXOffset,
                74,
                screen().width - 12,
                43,
                15
            )

            screen().fillRect(
                boxXOffset,
                74,
                (screen().width - 12) - 2,
                43 - 2,
                6
            )

            screen().fillRect(
                boxXOffset + 4,
                80,
                4,
                4,
                1
            ) // Bulletpoint

            screen().print(
                "Use Up, Down, Left and\nRight for selection.",
                13,
                78,
            )

            screen().fillRect(
                boxXOffset + 4,
                102,
                4,
                4,
                1
            ) // Bulletpoint

            screen().print(
                "Press A to confirm.",
                13,
                101,
            ) // End of Tutorial text
        }
    }


    // export class EventLoggingScene extends Scene {
    //     private guiState: GUI_STATE = GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS;
    //     private numberOfMeasurements: number = 10;
    //     private periodSeconds: number = 1;

    //     constructor(app: AppInterface) {
    //         super(app)
    //     }

    //     /* override */ startup() {
    //         super.startup()
    //         control.onEvent(
    //             ControllerButtonEvent.Pressed,
    //             controller.right.id,
    //             () => {
    //                 this.guiState =
    //                     (this.guiState == GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS) ?
    //                         this.guiState = GUI_STATE.CHANGING_PERIOD_SECONDS :
    //                         this.guiState = GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS
    //             }
    //         )

    //         control.onEvent(
    //             ControllerButtonEvent.Pressed,
    //             controller.left.id,
    //             () => {
    //                 this.guiState =
    //                     (this.guiState == GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS) ?
    //                         this.guiState = GUI_STATE.CHANGING_PERIOD_SECONDS :
    //                         this.guiState = GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS
    //             }
    //         )

    //         control.onEvent(
    //             ControllerButtonEvent.Pressed,
    //             controller.up.id,
    //             () => {
    //                 let tick = true;
    //                 control.onEvent(
    //                     ControllerButtonEvent.Released,
    //                     controller.up.id,
    //                     () => tick = false
    //                 )

    //                 // Control logic:
    //                 while (tick) {
    //                     if (this.guiState == GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS)
    //                         this.numberOfMeasurements += 1
    //                     else
    //                         this.periodSeconds += 1
    //                     basic.pause(100)
    //                 }
    //                 // Reset binding
    //                 control.onEvent(ControllerButtonEvent.Released, controller.up.id, () => { })
    //             }
    //         )

    //         control.onEvent(
    //             ControllerButtonEvent.Pressed,
    //             controller.down.id,
    //             () => {
    //                 let tick = true;
    //                 control.onEvent(
    //                     ControllerButtonEvent.Released,
    //                     controller.down.id,
    //                     () => tick = false
    //                 )

    //                 // Control logic:
    //                 while (tick) {
    //                     if (this.guiState == GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS)
    //                         this.numberOfMeasurements = Math.max(1, this.numberOfMeasurements - 1)
    //                     else
    //                         this.periodSeconds = Math.max(1, this.periodSeconds - 1)
    //                     basic.pause(100)
    //                 }
    //                 // Reset binding
    //                 control.onEvent(ControllerButtonEvent.Released, controller.down.id, () => { })
    //             }
    //         )

    //         control.onEvent(
    //             ControllerButtonEvent.Pressed,
    //             controller.A.id,
    //             () => {
    //                 basic.showLeds(`
    //                     . . . . .
    //                     . # . # .
    //                     . . . . .
    //                     # . . . #
    //                     . # # # .
    //                 `)
    //             }
    //         )

    //         control.onEvent(
    //             ControllerButtonEvent.Pressed,
    //             controller.B.id,
    //             () => {
    //                 this.app.popScene();
    //                 this.app.pushScene(new LoggingModeSelection(this.app))
    //             }
    //         )
    //     }

    //     draw() {
    //         screen().fill(12);

    //         const textFont = bitmaps.font12;
    //         const textXOffset = 30;
    //         const numberOfMeasurementsCenteringOffset =
    //             ((this.numberOfMeasurements.toString().length * textFont.charWidth) >> 1);
    //         const periodCenteringOffset =
    //             ((this.periodSeconds.toString().length * textFont.charWidth) >> 1);

    //         const triangleWidth = 22;

    //         const sensorName = "Accel. X"
    //         screen().fillRect(
    //             (screen().width >> 1) - ((sensorName.length * font.charWidth) >> 1) + 2,
    //             5 + 2,
    //             (sensorName.length * font.charWidth) + 6 + 1,
    //             font.charHeight + 3 + 1,
    //             15
    //         )

    //         screen().fillRect(
    //             (screen().width >> 1) - ((sensorName.length * font.charWidth) >> 1),
    //             5,
    //             (sensorName.length * font.charWidth) + 6,
    //             font.charHeight + 3,
    //             6
    //         )

    //         screen().fillRect(
    //             textXOffset - numberOfMeasurementsCenteringOffset - 3,
    //             (screen().height >> 1) - (textFont.charHeight >> 1) + 1,
    //             (numberOfMeasurementsCenteringOffset * 2) + 2,
    //             textFont.charHeight + 3,
    //             15
    //         )

    //         screen().fillRect(
    //             textXOffset - numberOfMeasurementsCenteringOffset - 4,
    //             (screen().height >> 1) - (textFont.charHeight >> 1),
    //             (numberOfMeasurementsCenteringOffset * 2) + 1,
    //             textFont.charHeight + 2,
    //             4
    //         )

    //         screen().fillRect(
    //             screen().width - textXOffset - periodCenteringOffset - 3,
    //             (screen().height >> 1) - (textFont.charHeight >> 1) + 1,
    //             (periodCenteringOffset * 2) + 2,
    //             textFont.charHeight + 3,
    //             15
    //         )

    //         screen().fillRect(
    //             screen().width - textXOffset - periodCenteringOffset - 4,
    //             (screen().height >> 1) - (textFont.charHeight >> 1),
    //             (periodCenteringOffset * 2) + 1,
    //             textFont.charHeight + 2,
    //             4
    //         )

    //         for (let i = 0; i < 2; i++) { // Embolden
    //             screen().print(
    //                 sensorName,
    //                 (screen().width >> 1) - ((sensorName.length * font.charWidth) >> 1) + 4 + i,
    //                 5 + 2,
    //                 15
    //             )

    //             screen().print(
    //                 "" + this.numberOfMeasurements,
    //                 textXOffset - i - numberOfMeasurementsCenteringOffset,
    //                 (screen().height >> 1) - (textFont.charHeight >> 1),
    //                 15,
    //                 textFont
    //             )

    //             screen().print(
    //                 "" + this.periodSeconds,
    //                 screen().width - textXOffset - i - periodCenteringOffset,
    //                 (screen().height >> 1) - (textFont.charHeight >> 1),
    //                 15,
    //                 textFont
    //             )
    //         }

    //         let xOffset =
    //             (this.guiState == GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS) ?
    //                 screen().width - 30 : (screen().width >> 1);

    //         screen().fillRect(
    //             xOffset - (screen().width >> 1) + 2,
    //             25 - 1,
    //             (screen().width >> 1) + 24,
    //             screen().height - 40,
    //             15
    //         )

    //         screen().fillRect(
    //             xOffset - (screen().width >> 1) + 4,
    //             25 + 1,
    //             (screen().width >> 1) + 24 - 5,
    //             screen().height - 40 - 5,
    //             6
    //         )

    //         screen().fillRect(
    //             xOffset - (screen().width >> 1) + 6,
    //             25 + 6,
    //             3,
    //             3,
    //             15
    //         )

    //         const tips = (this.guiState == GUI_STATE.CHANGING_NUMBER_OF_MEASUREMENTS) ?
    //             ["Use Up and Down\nto change the\nnumber of\nmeasurements.",
    //                 "Press Right to\nprogress."] :
    //             ["Use Up and Down\nto change the\nseconds between\nmeasurements.",
    //                 "Press A when\nyou're done."];

    //         screen().print(
    //             tips[0],
    //             xOffset - (screen().width >> 1) + 10,
    //             25 + 4,
    //             15
    //         )

    //         screen().fillRect(
    //             xOffset - (screen().width >> 1) + 6,
    //             75 + 6,
    //             3,
    //             3,
    //             15
    //         )

    //         screen().print(
    //             tips[1],
    //             xOffset - (screen().width >> 1) + 10,
    //             75 + 4,
    //             15
    //         )
    //     }
    // }

    export class LoggingModeSelection extends CursorSceneWithPriorPage {
        constructor(app: AppInterface) {
            super(app, () => {this.app.popScene(); this.app.pushScene(new Home(this.app))})
        }

        /* override */ startup(controlSetupFn?: () => void) {
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
                        this.app.pushScene(new IntervalMode(this.app))
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
                        this.app.pushScene(new IntervalMode(this.app))
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

