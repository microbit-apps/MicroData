namespace microdata {
  /** Number of sensor information boxes that can fit onto the screen at once*/
  const MAX_SENSORS_ON_SCREEN: number = 5
  /** The colours that will be used for the lines & sensor information boxes */
  const SENSOR_BOX_COLORS: number[] = [2, 3, 4, 6, 7, 9]
  /** The colours that will be used for writing the information about the sensor. */
  const SENSOR_BOX_TEXT_COLORS: number[] = [1, 1, 1, 1, 15, 15]

  const halfWidth = ui.STANDARD_DISPLAY_WIDTH >> 1
  const halfHeight = ui.STANDARD_DISPLAY_HEIGHT >> 1

  /**
   * Responsible for invoking the logging commands for each sensor,
   * Presents information about each sensor's state via colourful collapsing boxes
   * 
   * Sensors are logged via a scheduler
   */
  export class DataRecorder extends ui.UiScreen {
    /**  */
    private scheduler: sensors.SensorScheduler;
    /** For displaying their status on the screen and passing to the scheduler. */
    private sensors: sensors.Sensor[]
    /** For faster looping, modulo calculation when pressing UP or DOWN */
    private numberOfSensors: number;
    /** Sensor to be shown */
    private currentSensorIndex: number;
    /** Last sensor on the screen */
    private sensorIndexOffset: number;
    /** For the currentSensorIndex */
    private sensorBoxColor: number;

    private showCancelRecordingScreen: boolean;
    private currentlyCancelling: boolean
    // private yesBtn: Sprite // currentBtn = 0
    // private noBtn: Sprite // currentBtn = 1

    constructor(runtime: ui.UiRuntime, s: sensors.Sensor[]) {
      super(runtime)

      this.scheduler = new sensors.SensorScheduler(s)
      this.sensors = s
      this.numberOfSensors = s.length

      this.sensorIndexOffset = 0
      this.currentSensorIndex = 0
      this.sensorBoxColor = 15
      this.showCancelRecordingScreen = false;
      this.currentlyCancelling = false;

      //---------------
      // User Controls:
      //---------------

      // // Go Back:
      // context.onEvent(
      //   ControllerButtonEvent.Pressed,
      //   controller.B.id,
      //   () => {
      //     if (this.scheduler.loggingComplete()) {
      //       this.app.popScene()
      //       this.app.pushScene(new Home(this.app))
      //     }
      //
      //     else {
      //       this.showCancelRecordingScreen = !this.showCancelRecordingScreen
      //     }
      //   }
      // )
      //
      // // Clear whatever A was previously bound to
      // context.onEvent(
      //   ControllerButtonEvent.Pressed,
      //   controller.A.id,
      //   () => {
      //     if (this.showCancelRecordingScreen) {
      //       this.currentlyCancelling = true
      //       this.scheduler.stop()
      //
      //       basic.pause(1000)
      //       this.app.popScene()
      //       this.app.pushScene(new Home(this.app))
      //     }
      //   }
      // )
      //
      // // Scroll Up
      // context.onEvent(
      //   ControllerButtonEvent.Pressed,
      //   controller.up.id,
      //   () => {
      //     this.currentSensorIndex = Math.max(0, this.currentSensorIndex - 1)
      //
      //     if (this.sensorIndexOffset > 0)
      //       this.sensorIndexOffset = Math.max(0, this.sensorIndexOffset - 1)
      //
      //     this.update()
      //   }
      // )
      //
      // // Scroll Down
      // context.onEvent(
      //   ControllerButtonEvent.Pressed,
      //   controller.down.id,
      //   () => {
      //     this.currentSensorIndex = Math.min(this.currentSensorIndex + 1, this.numberOfSensors - 1)
      //
      //     if (this.currentSensorIndex > 4)
      //       this.sensorIndexOffset = Math.min(this.sensorIndexOffset + 1, this.numberOfSensors - 5)
      //
      //     this.update()
      //   }
      // )
      //
      //
      // // For cancelling the current recording:
      //
      // this.yesBtn = new Sprite({ img: Icons.get("tile_button_a") })
      // this.yesBtn.bindXfrm(new Affine())
      // this.yesBtn.xfrm.parent = new Affine()
      // this.yesBtn.xfrm.worldPos.x = Screen.HALF_WIDTH
      // this.yesBtn.xfrm.worldPos.y = Screen.HALF_HEIGHT
      // this.yesBtn.xfrm.localPos.x = -40
      // this.yesBtn.xfrm.localPos.y = 12
      //
      // this.noBtn = new Sprite({ img: Icons.get("tile_button_b") })
      // this.noBtn.bindXfrm(new Affine())
      // this.noBtn.xfrm.parent = new Affine()
      // this.noBtn.xfrm.worldPos.x = Screen.HALF_WIDTH
      // this.noBtn.xfrm.worldPos.y = Screen.HALF_HEIGHT
      // this.noBtn.xfrm.localPos.x = 40
      // this.noBtn.xfrm.localPos.y = 12

      this.log()
    }

    log() { this.scheduler.start() }

    private drawCenteredText(surface: ui.DrawSurface, text: string, y: number, color: number): void {
      const size = surface.measureText(text)
      const x = Math.max(0, Math.idiv(ui.STANDARD_DISPLAY_WIDTH - size.width, 2))
      surface.drawText(text, x, y, { color })
    }

    private rect(x: number, y: number, width: number, height: number): ui.Rect {
      return new ui.Rect(x, y, width, height) // if this constructor exists
    }

    public render(surface: ui.DrawSurface): void {
      surface.clear(0xC);

      const halfWidth = ui.STANDARD_DISPLAY_WIDTH >> 1
      const halfHeight = screen().height >> 1

      if (this.scheduler.loggingComplete()) {
        this.drawCenteredText(surface, "Data Logging Complete.", halfHeight - 10, 15);
        this.drawCenteredText(surface, "Press B to back out.", halfHeight, 15);
      }

      else {
        this.drawCenteredText(surface, "Recording data...", 4, 15);
        let y = 16

        for (let i = this.sensorIndexOffset; i < this.numberOfSensors; i++) {
          if (i - this.sensorIndexOffset > MAX_SENSORS_ON_SCREEN)
            break

          this.sensorBoxColor = SENSOR_BOX_COLORS[i % SENSOR_BOX_COLORS.length]
          const boxWidth: number = 142

          if (i != this.currentSensorIndex) {
            surface.fillRect(new ui.Rect(5, y, boxWidth, 16), 16)
            surface.fillRect(new ui.Rect(7, y, boxWidth + 3, 14), this.sensorBoxColor)
            surface.drawText(this.sensors[i].name, 12, y + 2, { color: 15 })
          }

          else {
            surface.fillRect(new ui.Rect(5, y, boxWidth, 62), 15)
            surface.fillRect(new ui.Rect(7, y, boxWidth + 3, 60), this.sensorBoxColor)

            const sensor = this.sensors[i]
            surface.drawText(sensor.name, 12, y + 2, { color: 15 })

            const sensorInfo: string[] = sensor.isInEventMode
              ? sensor.getEventInformation()
              : sensor.getRecordingInformation();

            sensorInfo.forEach((info, idx) => {
              y += 12
              surface.drawText(info, 24, y, { color: SENSOR_BOX_TEXT_COLORS[idx] })
            });
          }

          y += 14
        }

        if (this.showCancelRecordingScreen) {
          const headerX = halfWidth;

          surface.fillRect(new ui.Rect(halfWidth - 65, halfHeight - 30, 132, 62), 15)
          surface.fillRect(new ui.Rect(halfWidth - 65, halfHeight - 30, 130, 60), 4)

          const titleText = "Cancel recording?"
          const titleSize = surface.measureText(titleText)
          const titleX = headerX - (titleSize.width >> 1)
          const titleY = halfHeight - 30 + 7
          surface.drawText(titleText, titleX, titleY, { color: 15 })

          surface.fillRect(new ui.Rect(titleX - 1, halfHeight - 30 + 16, titleSize.width, 2), 15)

          if (this.currentlyCancelling)
            this.drawCenteredText(surface, "Cancelling...", halfHeight - 9, 15)

          surface.drawText("Yes", halfWidth - 48, halfHeight + 20, { color: 15 })
          surface.drawText("No", halfWidth + 33, halfHeight + 20, { color: 15 })

          surface.fillRect(new ui.Rect(halfWidth - 47, halfHeight + 6, 12, 12), 1)
          surface.fillRect(new ui.Rect(halfWidth + 34, halfHeight + 6, 12, 12), 1)
        }
      }
    }
  }
}

namespace microdata {
  const SENSOR_VALUE_WIDTH = 30

  const SENSOR_ACTION_SCOPE = "live-graph/actions"
  const MAX_SENSORS = 3

  interface SensorChoice {
    sensor: sensors.Sensor;
  }

  interface SensorLoggingInfo {
    sensor: sensors.Sensor | undefined,
    number_of_measurements: number | undefined,
    measurement_interval_ms: number | undefined
  }

  function getDefaultSensorLoggingInfoObj(): SensorLoggingInfo {
    return { sensor: undefined, number_of_measurements: undefined, measurement_interval_ms: undefined }
  }

  type SensorAction = "sensors"
  type TimeAction = "time"
  type DoneAction = "done"
  type AddAction = "add"
  type RemoveAction = "remove"

  type GridActions = SensorAction | TimeAction | AddAction | RemoveAction | DoneAction

  const SENSOR_PICKER_SCOPE = "select-sensor"
  const SENSOR_PICKER_COLUMNS = 5
  const SENSOR_PICKER_ITEM_WIDTH = 28
  const SENSOR_PICKER_ITEM_HEIGHT = 28
  const SENSOR_PICKER_GAP = 3

  const SENSOR_ACTION_BAND_HEIGHT = 16
  const SENSOR_ACTION_WIDTH = 40
  const SENSOR_ACTION_HEIGHT = 22
  const SENSOR_ACTION_GAP_H = 8
  const SENSOR_ACTION_GAP_V = 5
  const SENSOR_ACTION_CENTER_Y = (SENSOR_PICKER_ITEM_HEIGHT >> 1) + 3

  // Selected sensors get a thick yellow rounded border.
  const SENSOR_SELECTED_STYLE: ui.UiButtonStyle = {
    backgroundColor: 1,
    frame: "roundedRect",
    borderColor: 5,
    borderThickness: 3,
  }

  export class RecordData extends ui.UiScreen {
    private sensorLoggingInfos: SensorLoggingInfo[]
    private actions: ui.UiGrid<GridActions>;

    constructor(runtime: ui.UiRuntime) {
      super(runtime)

      this.backgroundColor = 6
      this.sensorLoggingInfos = [getDefaultSensorLoggingInfoObj()];

      this.actions = new ui.UiGrid<GridActions>({
        scopeId: SENSOR_ACTION_SCOPE,
        controls: this.getRowOfLoggingActions(0).concat(this.getRowOfAddRemoveDeleteActions()),
        controlSize: { width: SENSOR_ACTION_WIDTH, height: SENSOR_ACTION_HEIGHT },
        columnCount: 3,
        controlStyle: ui.UiButtonStyles.LightShadowedWhite,
        rowGap: SENSOR_ACTION_GAP_V,
        columnGap: SENSOR_ACTION_GAP_H,
      });

      this.addCentered(
        this.actions,
        SENSOR_ACTION_CENTER_Y,
        ui.STANDARD_DISPLAY_WIDTH,
        SENSOR_ACTION_BAND_HEIGHT
      );
    }

    public handleInput(event: ui.UiInputEvent): undefined | boolean {
      if (event.action === "cancel" && event.phase === "pressed") {
        this.runtime.pop();
        return true;
      }
      return undefined;
    }

    // Sensors are keyed by name for ownership checks (Sensor instances may be
    // rebuilt between calls, so don't rely on reference equality).
    private rowIndexForSensor(sensor: sensors.Sensor): number {
      for (let i = 0; i < this.sensorLoggingInfos.length; i++) {
        if (this.sensorLoggingInfos[i].sensor !== undefined &&
          this.sensorLoggingInfos[i].sensor.name === sensor.name) return i;
      }
      return -1;
    }

    private openSelectSensorsPicker(rowIdx: number): void {
      const availableSensors: sensors.Sensor[] =
        sensors.getAllMicrobitSensors().concat(sensors.getAllConnectedJacdacSimpleSensors());

      const sensorControls: ui.UiControl<SensorChoice>[] =
        availableSensors.map((sensor: sensors.Sensor, i: number) => {
          const owner = this.rowIndexForSensor(sensor);
          const isMine = owner === rowIdx;
          const takenByOther = owner >= 0 && !isMine;

          return {
            id: `sensor-${i}`,
            value: { sensor },
            focusLabel: takenByOther ? `${sensor.name} (in use)` : sensor.name,
            bitmap: sensorNameToBitmap(sensor.name, sensor.isJacdacSensor),
            style: (isMine || takenByOther) ? SENSOR_SELECTED_STYLE : undefined,
            focusable: !takenByOther,
          };
        });

      const modal = new ui.UiPicker<SensorChoice>({
        modalScopeId: SENSOR_PICKER_SCOPE,
        title: "Sensors",
        controls: sensorControls,
        columnCount: SENSOR_PICKER_COLUMNS,
        controlSize: { width: SENSOR_PICKER_ITEM_WIDTH, height: SENSOR_PICKER_ITEM_HEIGHT },
        columnGap: SENSOR_PICKER_GAP,
        rowGap: SENSOR_PICKER_GAP,
        controlStyle: ui.UiButtonStyles.LightShadowedWhite,
        closeOnActivate: true,
        onActivate: (
          choice: SensorChoice,
          control: ui.UiControl<SensorChoice>
        ) => {
          this.sensorLoggingInfos[rowIdx].sensor = choice.sensor;
          const sensorButton = this.actions.controls.find(c => c.id === `sensors-${rowIdx}`);
          sensorButton.bitmap = sensorNameToBitmap(choice.sensor.name, choice.sensor.isJacdacSensor)
          sensorButton.focusLabel = choice.sensor.name

          this.rebuildGrid();
        },
      });
      this.openModal(modal)
    }

    private openSelectNumMeasurementsPicker(rowIdx: number): void {
      this.openModal(
        new ui.UiNumericEntryModal("num-measurements-editor", this.sensorLoggingInfos[0].number_of_measurements, value => {
          this.sensorLoggingInfos[rowIdx].number_of_measurements = value
          const sensorButton = this.actions.controls.find(c => c.id === `num_measurements-${rowIdx}`);
          sensorButton.text = "" + value
          sensorButton.bitmap = undefined

          this.rebuildGrid()
        }),
      )
    }

    private openSelectMeasurementIntervalPicker(rowIdx: number): void {
      this.openModal(
        new ui.UiNumericEntryModal("interval-measurements-editor", this.sensorLoggingInfos[0].measurement_interval_ms, value => {
          this.sensorLoggingInfos[rowIdx].measurement_interval_ms = value
          const sensorButton = this.actions.controls.find(c => c.id === `interval_measurements-${rowIdx}`);
          sensorButton.text = "" + value + "ms"
          sensorButton.bitmap = undefined

          this.rebuildGrid()
        }),
      )
    }

    private getRowOfLoggingActions(idx: number): ui.UiControl<GridActions>[] {
      const info = this.sensorLoggingInfos[idx];
      return [
        {
          id: `sensors-${idx}`,
          value: "sensors",
          focusLabel: info.sensor !== undefined
            ? info.sensor.name
            : "Choose sensor",
          bitmap: info.sensor !== undefined
            ? sensorNameToBitmap(info.sensor.name, info.sensor.isJacdacSensor)
            : this.assets.getBitmap("btn_plus"),
          onActivate: () => this.openSelectSensorsPicker(idx),
        },
        {
          id: `num_measurements-${idx}`,
          value: "time",
          focusLabel: "Number of measurements",
          text: info.number_of_measurements !== undefined
            ? "" + info.number_of_measurements
            : undefined,
          bitmap: info.number_of_measurements === undefined
            ? this.assets.getBitmap("btn_plus")
            : undefined,
          onActivate: () => this.openSelectNumMeasurementsPicker(idx),
        },
        {
          id: `interval_measurements-${idx}`,
          value: "time",
          focusLabel: "Measurement interval",
          text: info.measurement_interval_ms === undefined
            ? undefined
            : `${info.measurement_interval_ms}ms`,
          bitmap: info.measurement_interval_ms === undefined
            ? this.assets.getBitmap("btn_plus")
            : undefined,
          onActivate: () => this.openSelectMeasurementIntervalPicker(idx),
        }
      ];
    }

    private getRowOfAddRemoveDeleteActions(): ui.UiControl<GridActions>[] {
      let actions: ui.UiControl<GridActions>[] = []

      if (this.sensorLoggingInfos.length < MAX_SENSORS) {
        actions.push(
          {
            id: "add",
            value: "add",
            text: "Add",
            onActivate: () => {
              this.sensorLoggingInfos.push(getDefaultSensorLoggingInfoObj());

              const controls = this.sensorLoggingInfos
                .reduce<ui.UiControl<GridActions>[]>((acc, _, i) => acc.concat(this.getRowOfLoggingActions(i)), [])
                .concat(this.getRowOfAddRemoveDeleteActions());

              const oldActions = this.actions;
              this.actions = new ui.UiGrid<GridActions>({
                scopeId: SENSOR_ACTION_SCOPE,
                controls,
                controlSize: { width: SENSOR_ACTION_WIDTH, height: SENSOR_ACTION_HEIGHT },
                columnCount: 3,
                controlStyle: ui.UiButtonStyles.LightShadowedWhite,
                rowGap: SENSOR_ACTION_GAP_V,
                columnGap: SENSOR_ACTION_GAP_H,
              });

              this.remove(oldActions);
              this.addCentered(this.actions, SENSOR_ACTION_CENTER_Y, ui.STANDARD_DISPLAY_WIDTH, SENSOR_ACTION_BAND_HEIGHT);
              this.rebuildGrid();
            },
            visible: false,
            focusable: false,
          },
        )
      }

      actions.push(
        {
          id: "done",
          value: "done",
          text: "Done",
          onActivate: () => {
            const s: sensors.Sensor[] = this.sensorLoggingInfos.map(info => {
              info.sensor.setConfig({ measurements: info.number_of_measurements, period: info.measurement_interval_ms })
              return info.sensor;
            })

            this.runtime.push(new DataRecorder(this.runtime, s));
          },
          visible: false,
          focusable: false,
        },
      );
      return actions;
    }

    private isSensorLoggingInfoFilledIn(info: SensorLoggingInfo): boolean {
      return info.sensor !== undefined &&
        info.number_of_measurements !== undefined &&
        info.measurement_interval_ms !== undefined;
    }

    private rebuildGrid() {
      const complete = this.sensorLoggingInfos.every(info => this.isSensorLoggingInfoFilledIn(info));
      for (const id of ["add", "done"]) {
        const control = this.actions.controls.find(c => c.id === id);
        if (!control) continue;
        control.visible = complete;
        control.focusable = complete;
      }

      this.actions.invalidateLayout()
      this.actions.registerFocusTargets(this.focus)
      this.actions.registerNavigation(this.focusInput);
    }

    public render(surface: ui.DrawSurface): void {
      super.render(surface)
    }
  }
}
