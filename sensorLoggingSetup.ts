namespace microdata {
  const MAX_SENSORS = 3

  const CONFIG_SCOPE = "logging-sensor-setup/config"
  const SENSOR_SCOPE = "logging-sensor-setup/sensors"
  const DONE_SCOPE = "logging-sensor-setup/done"
  const LENGTH_UNIT_SCOPE = "select-length-unit"
  const INTERVAL_UNIT_SCOPE = "select-interval-unit"
  const LENGTH_ENTRY_SCOPE = "length-editor"
  const INTERVAL_ENTRY_SCOPE = "interval-editor"

  const CONFIG_IDS = ["length", "length_unit", "interval", "interval_unit"]
  const CONFIG_LABELS = ["Total recording time", "Units", "Recording interval time", "Units"]

  const ACTION_WIDTH = 34
  const ACTION_HEIGHT = 22
  const ACTION_GAP = 4
  const DONE_WIDTH = 44
  const DONE_HEIGHT = 20

  const LABEL_COLOR = 15
  const CENTER_X = ui.STANDARD_DISPLAY_WIDTH >> 1
  const TITLE_Y = 2
  const CONFIG_HEADER_Y = 13
  const CONFIG_ROW_CENTER_Y = 36
  const SENSOR_HEADER_Y = 50
  const SENSOR_ROW_CENTER_Y = 73
  const DONE_CENTER_Y = ui.STANDARD_DISPLAY_HEIGHT - 14

  const TIME_UNITS: string[] = ["ms", "sec", "min", "hr"]
  const TIME_UNIT_MS: number[] = [1, 1000, 60000, 3600000]

  interface RecordingConfig {
    length: number | undefined
    lengthUnit: string | undefined
    interval: number | undefined
    intervalUnit: string | undefined
  }

  type GridActions = "length" | "length_unit" | "interval" | "interval_unit" | "sensor" | "done"

  // Three rows, each centered on its own width, so none of them can share a
  // UiGrid: a grid arranges every row from the same left edge. Each row is a
  // separate root view and therefore owns a separate focus scope, and focus does
  // not cross scopes on its own. This screen supplies that link by acting as the
  // navigation provider for all three scopes (see `activate()` and `move()`).
  //
  // `implements ui.UiFocusNavigationProvider` makes the compiler check that `move()`
  // matches the interface; what the runtime cares about is that the object handed
  // to setNavigation has a `move` method.
  export class SensorLoggingSetup extends ui.UiScreen implements ui.UiFocusNavigationProvider {
    private recordingConfig: RecordingConfig
    private selectedSensors: sensors.Sensor[]
    private configControls: ui.UiControl<GridActions>[]
    private sensorControls: ui.UiControl<GridActions>[]
    private doneControl: ui.UiControl<GridActions>
    private rows: ui.UiRow<GridActions>[]
    private rowTargets: ui.UiFocusNavigationTarget[][]

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

      this.configControls = this.createConfigActions()
      this.sensorControls = this.createSensorActions()
      this.doneControl = { id: "done", value: "done", onActivate: () => { } }

      this.rows = [
        this.createRow(CONFIG_SCOPE, this.configControls, ACTION_WIDTH, ACTION_HEIGHT),
        this.createRow(SENSOR_SCOPE, this.sensorControls, ACTION_WIDTH, ACTION_HEIGHT),
        this.createRow(DONE_SCOPE, [this.doneControl], DONE_WIDTH, DONE_HEIGHT),
      ]
      this.rowTargets = this.rows.map(row => <ui.UiFocusNavigationTarget[]>[])

      this.add(new ui.UiLabel({ text: "Data logging setup", color: LABEL_COLOR }), { x: 24, y: TITLE_Y })
      this.add(new ui.UiLabel({ text: "Recording time", color: LABEL_COLOR }), { centerX: CENTER_X, y: CONFIG_HEADER_Y })
      this.add(new ui.UiLabel({ text: "Sensors", color: LABEL_COLOR }), { centerX: CENTER_X, y: SENSOR_HEADER_Y })

      this.addCentered(this.rows[0], CONFIG_ROW_CENTER_Y, ui.STANDARD_DISPLAY_WIDTH, ACTION_HEIGHT)
      this.addCentered(this.rows[1], SENSOR_ROW_CENTER_Y, ui.STANDARD_DISPLAY_WIDTH, ACTION_HEIGHT)
      this.addCentered(this.rows[2], DONE_CENTER_Y, ui.STANDARD_DISPLAY_WIDTH, DONE_HEIGHT)

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

    // focusInput (the UiFocusInputController) keeps one navigation entry per
    // focus scope. An entry is either plain data ({kind:"row"}, the snapshot of
    // targets a UiRow registers for itself) or a provider object, which is
    // anything carrying a move() method. setNavigation replaces the entry for a
    // scope, so registering this screen for all three scopes takes over from the
    // rows: whichever row holds focus, the controller finds this provider.
    //
    // Timing: pushing the screen rebuilds its focus state and registers its root
    // views, which is where each row registers its own navigation. activate()
    // runs after that, and again whenever this screen returns to the top (after
    // the sensor picker, say), so the links always go on last.
    public activate(): void {
      for (let i = 0; i < this.rows.length; i++)
        this.focusInput.setNavigation(this.rows[i].scopeId, this)
    }

    // Called by focusInput on a direction press, for the scope that currently
    // holds focus. This only describes where focus should go; the controller
    // applies the answer with focus.setActiveTarget(toScopeId, toTargetId),
    // taking the scope from the result rather than from the request. Returning a
    // different toScopeId is therefore all it takes to move between rows.
    //
    // Feeding every row's targets to moveFocusInRaggedGrid lets the library do
    // the work: left and right wrap inside the current row, up and down pick the
    // horizontally nearest control of the next row that has one, and rows whose
    // controls are all hidden are skipped. Only the scope needs correcting
    // afterwards, because that call stamps one scope on both ends of its result
    // while each row here owns its own.
    //
    // Directions are the only thing routed here. Activate and cancel presses
    // take other branches in the controller, and this screen's handleInput
    // intercepts cancel before focus is consulted at all.
    public move(request: ui.UiFocusNavigationRequest): ui.UiFocusMoveResult {
      if (this.rowIndex(request.scopeId) < 0) return undefined

      const rows = this.navigationRows()
      const result = ui.moveFocusInRaggedGrid({
        scopeId: request.scopeId,
        currentTargetId: request.currentTargetId,
        direction: request.direction,
        horizontalWrap: true,
        verticalStrategy: "nearest",
        rows,
      })
      if (result.kind !== "moved") return result

      const index = this.rowIndexForTarget(rows, result.toTargetId)
      if (index < 0) return result
      result.toScopeId = this.rows[index].scopeId
      return result
    }

    // One row of focus targets per UiRow, refilled on every move. A provider is
    // asked at press time, so this always sees current visibility; the snapshot
    // a row registers for itself would go stale as controls are shown and
    // hidden. The arrays are reused to keep the press path allocation-free.
    private navigationRows(): ui.UiFocusNavigationTarget[][] {
      for (let i = 0; i < this.rows.length; i++)
        this.rows[i].copyNavigationTargets(this.rowTargets[i])
      return this.rowTargets
    }

    // Which row owns a target, by its position in navigationRows(). Used to name
    // the destination scope of a move, and to tell whether the focused control
    // is still reachable.
    private rowIndexForTarget(rows: ui.UiFocusNavigationTarget[][], targetId: ui.UiFocusId): number {
      if (targetId === undefined) return -1
      for (let i = 0; i < rows.length; i++)
        for (let j = 0; j < rows[i].length; j++)
          if (rows[i][j].id === targetId) return i
      return -1
    }

    private createRow(
      scopeId: string,
      controls: ui.UiControl<GridActions>[],
      width: number,
      height: number
    ): ui.UiRow<GridActions> {
      return new ui.UiRow<GridActions>({
        scopeId,
        controls,
        controlSize: { width, height },
        controlStyle: ui.UiButtonStyles.LightShadowedWhite,
        gap: ACTION_GAP,
        wrap: true,
      })
    }

    private rowIndex(scopeId: ui.UiFocusScopeId): number {
      for (let i = 0; i < this.rows.length; i++)
        if (this.rows[i].scopeId === scopeId) return i
      return -1
    }

    private action(id: string): ui.UiControl<GridActions> {
      for (let i = 0; i < this.rows.length; i++) {
        const control = this.rows[i].controls.find(c => c.id === id)
        if (control) return control
      }
      return undefined
    }

    private createConfigActions(): ui.UiControl<GridActions>[] {
      const cfg = this.recordingConfig
      return [
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
    }

    private createSensorActions(): ui.UiControl<GridActions>[] {
      const controls: ui.UiControl<GridActions>[] = []
      for (let i = 0; i < MAX_SENSORS; i++)
        controls.push(this.createSensorAction(i))
      return controls
    }

    private createSensorAction(slot: number): ui.UiControl<GridActions> {
      return {
        id: `sensor-${slot}`,
        value: "sensor",
        onActivate: () => this.chooseSensorForSlot(slot),
      }
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

      for (let i = 0; i < this.rows.length; i++) {
        this.rows[i].invalidateLayout()
        this.rows[i].registerFocusTargets(this.focus)
      }
      this.restoreFocusIfHidden()
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

    // If the sync above hid the focused control, focus is left on a target no move
    // can start from, so send it back to the config row, which is always populated.
    private restoreFocusIfHidden(): void {
      const scopeId = this.focus.getActiveScopeId()
      if (this.rowIndex(scopeId) < 0) return
      const targetId = this.focus.getActiveTargetId(scopeId)
      if (this.rowIndexForTarget(this.navigationRows(), targetId) >= 0) return
      this.rows[0].focusDefault(this.focus)
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