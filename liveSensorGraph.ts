namespace microdata {
  interface SensorChoice {
    sensor: sensors.MicrobitAndJacdacSensors;
    name: string;
  }

  type SensorInfo = {
    sensor: sensors.Sensor,
    name: string,
    nameLabel: ui.UiLabel
    valueLabel: ui.UiLabel
    unitLabel: ui.UiLabel
  }

  type SensorAction = "sensors"

  const SENSOR_ACTION_SCOPE = "live-graph/actions"
  const SENSOR_ACTION_GAP = 8
  const SENSOR_ACTION_BAND_HEIGHT = 24
  const SENSOR_ACTION_CENTER_Y = 110
  const MAX_SENSORS = 3

  const SENSOR_PICKER_SCOPE = "select-sensor"
  const SENSOR_PICKER_COLUMNS = 5
  const SENSOR_PICKER_ITEM = 28
  const SENSOR_PICKER_GAP = 4

  const SENSOR_READOUT_X = 4
  const SENSOR_READOUT_Y = 1
  const SENSOR_ROW_GAP = 3
  const SENSOR_VALUE_WIDTH = 30

  // Selected sensors get a thick yellow rounded border.
  const SENSOR_SELECTED_STYLE: ui.UiButtonStyle = {
    backgroundColor: 1,
    frame: "roundedRect",
    borderColor: 5,
    borderThickness: 3,
  }

  export class LiveSensorGraph extends ui.UiScreen {
    private tick: number
    private graphRect: ui.Rect
    private connectedJacdacSensorSrvs: sensors.JacdacSensorSrvs[];
    private modal: ui.UiPicker<SensorChoice>; // now owned
    private sensorInfos: SensorInfo[]
    private readout: ui.UiStack
    private nameColumn: ui.UiStack
    private valueColumn: ui.UiStack
    private unitColumn: ui.UiStack


    constructor(runtime: ui.UiRuntime) {
      super(runtime)

      this.backgroundColor = 6
      this.tick = 0
      this.graphRect = new ui.Rect(8, 26, 144, 72)

      this.sensorInfos = []

      this.nameColumn = new ui.UiStack({ orientation: "column", children: [], gap: 0 })
      this.valueColumn = new ui.UiStack({ orientation: "column", children: [], gap: 0 })
      this.unitColumn = new ui.UiStack({ orientation: "column", children: [], gap: 0 })
      this.readout = new ui.UiStack({
        orientation: "row",
        children: [this.nameColumn, this.valueColumn, this.unitColumn],
        gap: SENSOR_ROW_GAP,
      })
      this.add(this.readout, { x: SENSOR_READOUT_X, y: SENSOR_READOUT_Y })

      const actions = new ui.UiRow<SensorAction>({
        scopeId: SENSOR_ACTION_SCOPE,
        controls: this.createActions(),
        controlStyle: ui.UiButtonStyles.LightShadowedWhite,
        gap: SENSOR_ACTION_GAP,
        wrap: true,
      });

      this.addCentered(
        actions,
        SENSOR_ACTION_CENTER_Y,
        ui.STANDARD_DISPLAY_WIDTH,
        SENSOR_ACTION_BAND_HEIGHT
      );
      this.connectedJacdacSensorSrvs = sensors.getConnectedJacdacSrvs();
      this.rebuildModal();
    }

     
    // I end up just rebuilding and reopening the picker here, which works but
    // Is there a better way of updating a modal?
    // I rebuild it instead of updating modal.controls the modal.controls is readonly.
    // What do you think?
    public activate(): void {
      jacdac.bus.on(jacdac.DEVICE_CONNECT, () => this.openSelectSensorsPicker())
      jacdac.bus.on(jacdac.DEVICE_DISCONNECT, () => this.openSelectSensorsPicker())
    }

    public deactivate(): void {
      jacdac.bus.off(jacdac.DEVICE_CONNECT, () => this.openSelectSensorsPicker())
      jacdac.bus.off(jacdac.DEVICE_DISCONNECT, () => this.openSelectSensorsPicker())
    }

    private createActions(): ui.UiControl<SensorAction>[] {
      return [
        ui.button<SensorAction>("sensors", "Sensors", () => {
          this.connectedJacdacSensorSrvs = sensors.getConnectedJacdacSrvs();
          this.openSelectSensorsPicker()
        }),
      ];
    }

    private activeIndexForName(name: string): number {
      for (let i = 0; i < this.sensorInfos.length; i++) {
        if (this.sensorInfos[i].name == name) return i
      }
      return -1
    }

    // Toggles a sensor channel on or off. Selection is keyed by sensor name.
    private toggleSensor(
      choice: SensorChoice,
      control: ui.UiControl<SensorChoice>
    ): void {
      const idx = this.activeIndexForName(choice.name)
      if (idx >= 0) {
        this.sensorInfos.splice(idx, 1)
        control.style = undefined
      } else {
        // At capacity: leave the cell unselected.
        if (this.sensorInfos.length >= MAX_SENSORS) return
        let sensor = undefined;
        try {
          sensor = sensors.getMicrobitSensor(choice.sensor as number as sensors.MicrobitSensors);
        } catch (e) {
          sensor = sensors.getJacdacSensor(choice.sensor as number as sensors.JacdacSensorSrvs, undefined);
        }

        const nameLabel = new ui.UiLabel(choice.name, 1)
        const valueLabel = new ui.UiLabel({
          text: "--",
          color: 1,
          size: { width: SENSOR_VALUE_WIDTH },
        })
        const unitLabel = new ui.UiLabel(`${sensor.unitSymbol}`, 1)
        nameLabel.setColor(15)
        unitLabel.setColor(15)
        this.sensorInfos.push({
          sensor,
          name: choice.name,
          nameLabel,
          valueLabel,
          unitLabel,
        })
        control.style = SENSOR_SELECTED_STYLE
      }
      this.rebuildReadout()
    }

    // Sets each readout column from the active sensors and assigns each value
    // label's color to match its graph line.
    private rebuildReadout(): void {
      const names: ui.UiView<any>[] = []
      const values: ui.UiView<any>[] = []
      const units: ui.UiView<any>[] = []
      for (let i = 0; i < this.sensorInfos.length; i++) {
        const info = this.sensorInfos[i]
        info.valueLabel.setColor(2 + i)
        names.push(info.nameLabel)
        values.push(info.valueLabel)
        units.push(info.unitLabel)
      }
      this.nameColumn.setChildren(names)
      this.valueColumn.setChildren(values)
      this.unitColumn.setChildren(units)
      this.remove(this.readout)
      this.add(this.readout, { x: SENSOR_READOUT_X, y: SENSOR_READOUT_Y })
    }

    public handleInput(event: ui.UiInputEvent): undefined | boolean {
      if (event.action === "cancel" && event.phase === "pressed") {
        this.runtime.pop();
        return true;
      }

      return undefined;
    }

    private rebuildModal(): void {
      // Not really a fan of this casting, need to refactor Sensors type/obj system
      const availableSensors = (sensors.listAllMicrobitSensors() as number[] as sensors.MicrobitAndJacdacSensors[]).concat(this.connectedJacdacSensorSrvs as number[] as sensors.MicrobitAndJacdacSensors[]);
      const connectedSensorNames = sensors.listAllMicrobitSensorsAsStrings().concat(this.connectedJacdacSensorSrvs.map(srv => sensors.getRolenameForJacdacSensor(srv)));

      const sensorControls: ui.UiControl<SensorChoice>[] =
        connectedSensorNames.map((name: string, i: number) => ({
          id: `sensor: ${i}`,
          value: { sensor: availableSensors[i], name },
          focusLabel: name,
          bitmap: sensorIDToBitmap(availableSensors[i]),
          // Reflect current selection so reopening the picker shows what's on.
          style: this.activeIndexForName(name) >= 0
            ? SENSOR_SELECTED_STYLE
            : undefined,
        }));

      this.modal = new ui.UiPicker<SensorChoice>({
        modalScopeId: SENSOR_PICKER_SCOPE,
        title: "Sensors",
        controls: sensorControls,
        columnCount: SENSOR_PICKER_COLUMNS,
        controlSize: { width: SENSOR_PICKER_ITEM, height: SENSOR_PICKER_ITEM },
        columnGap: SENSOR_PICKER_GAP,
        rowGap: SENSOR_PICKER_GAP,
        controlStyle: ui.UiButtonStyles.LightShadowedWhite,
        // Stay open so the user can toggle several sensors before backing out.
        closeOnActivate: true,
        onActivate: (
          choice: SensorChoice,
          control: ui.UiControl<SensorChoice>
        ) => this.toggleSensor(choice, control),
      });
    }

    private openSelectSensorsPicker(): void {
      this.connectedJacdacSensorSrvs = sensors.getConnectedJacdacSrvs();
      this.rebuildModal();
      this.openModal(this.modal)
    }

    public update(): void {
      this.tick += 1
      if (this.tick % 6 != 0) return;

      this.sensorInfos.forEach((info: SensorInfo) => {
        info.sensor.readIntoBufferOnce()
        info.valueLabel.setText(`${info.sensor.reading.toString().slice(0, 5)}`)
      })
    }

    public render(surface: ui.DrawSurface): void {
      // Graph area:
      surface.fillRect(this.graphRect, 0)
      surface.drawRect(this.graphRect, 1)

      // Center reference line, dotted so it doesn't read as a data trace.
      const midY = this.graphRect.y + Math.idiv(this.graphRect.height, 2)
      const dotEnd = this.graphRect.x + this.graphRect.width - 2
      for (let x = this.graphRect.x + 1; x <= dotEnd; x += 2) {
        surface.drawLine(x, midY, x, midY, 13)
      }

      this.sensorInfos.forEach((sensorInfo: SensorInfo, i: number) => {
        const sensor = sensorInfo.sensor
        const values = sensor.dataBuffer
        const range = sensor.max - sensor.min;
        const color = 2 + i;

        let previousX = 0
        let previousY = 0
        for (let i = 0; i < values.length; i++) {
          const x =
            this.graphRect.x +
            2 +
            Math.idiv(
              i * (this.graphRect.width - 4),
              values.length - 1,
            )
          const y =
            this.graphRect.y +
            this.graphRect.height -
            3 -
            Math.idiv(
              (values[i] - sensor.min) * (this.graphRect.height - 6),
              range
            );

          if (i > 0)
            surface.drawLine(previousX, previousY, x, y, color)
          previousX = x
          previousY = y
        }
      });
      // end of graph area

      super.render(surface)
    }
  }
}
