namespace microdata {
  import Screen = user_interface_base.Screen
  import CursorScene = user_interface_base.CursorScene
  import Button = user_interface_base.Button
  import ButtonStyles = user_interface_base.ButtonStyles
  import AppInterface = user_interface_base.AppInterface

  /**
   * Choose between:
   *      Resetting Datalogger
   *      A tabular view of the recorded data
   *      Jacdac light experiment
   */
  export class DataViewSelect extends CursorScene {
    private dataloggerEmpty: boolean

    constructor(app: AppInterface) {
      super(app);
    }

    /* override */ startup() {
      super.startup()
      basic.pause(50);

      // Includes the header:
      this.dataloggerEmpty = datalogger.getNumberOfRows() <= 1

      const y = Screen.HEIGHT * 0.234 // y = 30 on an Arcade Shield of height 128 pixels

      let btns: Button[][] = [[]];

      if (this.dataloggerEmpty) {
        btns[0].push(new Button({
          parent: null,
          style: ButtonStyles.Transparent,
          icon: "edit_program",
          ariaId: "Log Data",
          x: -50,
          y,
          onClick: () => {
            this.app.popScene()
            this.app.pushScene(new SensorSelect(this.app, MicroDataSceneEnum.RecordingConfigSelect))
          },
        }))
      } else {
        btns[0].push(new Button({
          parent: null,
          style: ButtonStyles.Transparent,
          icon: "largeDisk",
          ariaId: "View Data",
          x: -50,
          y,
          onClick: () => {
            this.app.popScene()
            this.app.pushScene(new TabularDataViewer(this.app, () => { this.app.popScene(); this.app.pushScene(new DataViewSelect(this.app)) }))
          }
        }))
      }

      btns[0].push(new Button({
        parent: null,
        style: ButtonStyles.Transparent,
        icon: "linear_graph_1",
        ariaId: "Jacdac Light Experiment",
        x: 0,
        y,
        onClick: () => {
          this.app.popScene()
          this.app.pushScene(new JacdacLightExperiment(this.app))
        },
      }))

      btns[0].push(new Button({
        parent: null,
        style: ButtonStyles.Transparent,
        icon: "largeSettingsGear",
        ariaId: "Reset Datalogger",
        x: 50,
        y,
        onClick: () => {
          datalogger.deleteLog()
          this.dataloggerEmpty = true

          context.onEvent(
            ControllerButtonEvent.Pressed,
            controller.A.id,
            () => {
              this.app.popScene()
              this.app.pushScene(new SensorSelect(this.app, MicroDataSceneEnum.RecordingConfigSelect))
            }
          )
        },
      }))
      this.navigator.setBtns(btns)

      //---------
      // Control:
      //---------

      context.onEvent(
        ControllerButtonEvent.Pressed,
        controller.B.id,
        () => {
          this.app.popScene()
          this.app.pushScene(new Home(this.app))
        }
      )
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
        screen().printCenter("Log Data to collect some!", Screen.HALF_HEIGHT - 30)
      }

      else {
        screen().printCenter("View Data, Experiment or Clear Data", 5)
      }

      this.navigator.drawComponents();
      super.draw()
    }
  }
}
