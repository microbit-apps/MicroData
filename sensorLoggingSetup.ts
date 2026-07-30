namespace microdata {
  const MAX_SENSORS = 3

  const ACTION_SCOPE = "logging-sensor-setup/actions"
  const LENGTH_UNIT_SCOPE = "select-length-unit"
  const INTERVAL_UNIT_SCOPE = "select-interval-unit"
  const LENGTH_ENTRY_SCOPE = "length-editor"
  const INTERVAL_ENTRY_SCOPE = "interval-editor"

  const CONFIG_IDS = ["length", "length_unit", "interval", "interval_unit"]
  const CONFIG_LABELS = ["Total recording time", "Units", "Recording interval time", "Units"]

  const ACTION_COLUMNS = 4
  const ACTION_WIDTH = 34
  const ACTION_HEIGHT = 22
  const ACTION_GAP_H = 4
  const ACTION_GAP_V = 5
  const ACTION_ROWS: number[] = [CONFIG_IDS.length, MAX_SENSORS, 1]
  const ACTION_BAND_HEIGHT = ACTION_ROWS.length * ACTION_HEIGHT + (ACTION_ROWS.length - 1) * ACTION_GAP_V
  const ACTION_CENTER_Y = ui.STANDARD_DISPLAY_HEIGHT >> 1

  const TIME_UNITS: string[] = ["ms", "sec", "min", "hr"]
  const TIME_UNIT_MS: number[] = [1, 1000, 60000, 3600000]

  interface RecordingConfig {
    length: number | undefined
    lengthUnit: string | undefined
    interval: number | undefined
    intervalUnit: string | undefined
  }

  type GridActions = "length" | "length_unit" | "interval" | "interval_unit" | "sensor" | "done"

  export class SensorLoggingSetup extends ui.UiScreen {
    private recordingConfig: RecordingConfig
    private selectedSensors: sensors.Sensor[]
    private actions: ui.UiGrid<GridActions>

    constructor(runtime: ui.UiRuntime) {
      super(runtime)

      this.backgroundColor = 6
      this.recordingConfig = {
        length: undefined,
        lengthUnit: undefined,
        interval: undefined,
        intervalUnit: undefined,
      }

      this.selectedSensors = []

      this.actions = new ui.UiGrid<GridActions>({
        scopeId: ACTION_SCOPE,
        controls: this.createActions(),
        controlSize: { width: ACTION_WIDTH, height: ACTION_HEIGHT },
        columnCount: ACTION_COLUMNS,
        rows: ACTION_ROWS,
        controlStyle: ui.UiButtonStyles.LightShadowedWhite,
        rowGap: ACTION_GAP_V,
        columnGap: ACTION_GAP_H,
      })

      this.add(new ui.UiLabel({ text: "Data logging setup", color: 15 }), { x: 24, y: 4 });
      this.addCentered(
        this.actions,
        ACTION_CENTER_Y,
        ui.STANDARD_DISPLAY_WIDTH,
        ACTION_BAND_HEIGHT
      )
      this.syncActionsWithSelectedSensors()

      sensors.onSimpleSensorChange(() => {
        const sensorNames = getAvailableMicrobitAndJacdacSensors().map(s => s.name)
        this.selectedSensors = this.selectedSensors.filter(s => sensorNames.indexOf(s.name) >= 0)
        this.syncActionsWithSelectedSensors()
      })
    }

    public handleInput(event: ui.UiInputEvent): undefined | boolean {
      if (event.action === "cancel" && event.phase === "pressed") {
        this.runtime.pop()
        return true
      }
      return undefined
    }

    private createActions(): ui.UiControl<GridActions>[] {
      const cfg = this.recordingConfig
      const controls: ui.UiControl<GridActions>[] = [
        {
          id: "length", value: "length",
          onActivate: () => this.editNumber(LENGTH_ENTRY_SCOPE, cfg.length, v => { cfg.length = v }),
        },
        {
          id: "length_unit", value: "length_unit",
          onActivate: () => this.editUnit(LENGTH_UNIT_SCOPE, "Total recording time units", u => { cfg.lengthUnit = u }),
        },
        {
          id: "interval", value: "interval",
          onActivate: () => this.editNumber(INTERVAL_ENTRY_SCOPE, cfg.interval, v => { cfg.interval = v }),
        },
        {
          id: "interval_unit", value: "interval_unit",
          onActivate: () => this.editUnit(INTERVAL_UNIT_SCOPE, "Interval units", u => { cfg.intervalUnit = u }),
        },
      ]

      for (let i = 0; i < MAX_SENSORS; i++)
        controls.push(this.createSensorAction(i))

      controls.push({ id: "done", value: "done", onActivate: () => { } })
      return controls
    }

    private createSensorAction(slot: number): ui.UiControl<GridActions> {
      return {
        id: `sensor-${slot}`,
        value: "sensor",
        onActivate: () => this.chooseSensorForSlot(slot),
      }
    }

    private action(id: string): ui.UiControl<GridActions> {
      return this.actions.controls.find(c => c.id === id)
    }

    // Update the text, focusLabel, bitmap, etc for the config and sensors buttons.
    // So that this.recordingConfig and this.selectedSensors are in sync with the GUI:
    private syncActionsWithSelectedSensors(): void {
      const cfg = this.recordingConfig
      const values: string[] = [
        (cfg.length === undefined) ? undefined : "" + cfg.length,
        cfg.lengthUnit,
        (cfg.interval === undefined) ? undefined : "" + cfg.interval,
        cfg.intervalUnit,
      ]

      let unlocked = true
      for (let i = 0; i < CONFIG_IDS.length; i += 2) {
        this.syncAction(CONFIG_IDS[i], unlocked, CONFIG_LABELS[i], values[i])
        this.syncAction(CONFIG_IDS[i + 1], unlocked, CONFIG_LABELS[i + 1], values[i + 1])
        unlocked = unlocked && (values[i] !== undefined) && (values[i + 1] !== undefined)
      }

      const shown = unlocked ? Math.min(this.selectedSensors.length + 1, MAX_SENSORS) : 0
      for (let i = 0; i < MAX_SENSORS; i++) {
        const sensor = this.selectedSensors[i]
        const control = this.syncAction(
          `sensor-${i}`,
          i < shown,
          sensor === undefined ? "Choose sensor" : sensor.name,
          undefined
        );

        if (sensor !== undefined)
          control.bitmap = sensorNameToBitmap(sensor.name, sensor.isJacdacSensor)
      }

      this.syncAction("done", this.selectedSensors.length > 0, "Done", "Done")

      this.actions.invalidateLayout()
      this.actions.registerFocusTargets(this.focus)
      this.actions.registerNavigation(this.focusInput)
    }

    private syncAction(id: string, visible: boolean, label: string, text: string): ui.UiControl<GridActions> {
      const control = this.action(id)
      control.visible = visible
      control.focusable = visible
      control.focusLabel = label
      control.text = text
      control.bitmap = (text === undefined) ? this.assets.getBitmap("btn_plus") : undefined
      return control
    }

    private editNumber(scopeId: string, value: number, apply: (value: number) => void): void {
      this.openModal(new ui.UiNumericEntryModal(scopeId, value, v => {
        apply(v)
        this.syncActionsWithSelectedSensors()
      }))
    }

    private editUnit(scopeId: string, title: string, apply: (unit: string) => void): void {
      this.openModal(new ui.UiPicker<string>(scopeId, title, TIME_UNITS, u => {
        apply(u)
        this.syncActionsWithSelectedSensors()
      }))
    }

    private slotForSensor(sensor: sensors.Sensor): number {
      return this.selectedSensors.map(s => s.name).indexOf(sensor.name)
    }

    private chooseSensorForSlot(slot: number): void {
      // This slot's own sensor stays pickable, others are locked:
      const own = this.selectedSensors[slot]
      openSensorPicker(getAvailableMicrobitAndJacdacSensors, {
        screen: this,
        selected: () => this.selectedSensors,
        pickedSensors: this.selectedSensors.filter(s => own === undefined || s.name !== own.name),
        onPick: sensor => this.selectSensor(slot, sensor),
        onUnpick: index => {
          this.selectedSensors.splice(index, 1)
          this.syncActionsWithSelectedSensors()
        },
      })
    }

    private selectSensor(slot: number, sensor: sensors.Sensor): void {
      const existing = this.slotForSensor(sensor)
      if (existing >= 0) {
        // Re-picking a slot's own sensor clears it:
        if (existing === slot) this.selectedSensors.splice(slot, 1)
        this.syncActionsWithSelectedSensors()
        return
      }
      if (slot < this.selectedSensors.length) this.selectedSensors[slot] = sensor
      else this.selectedSensors.push(sensor)
      this.syncActionsWithSelectedSensors()
    }

    private toMs(value: number, unit: string): number {
      return value * TIME_UNIT_MS[TIME_UNITS.indexOf(unit)]
    }
  }
}
