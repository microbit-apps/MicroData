namespace microdata {
  type SensorInfo = {
    sensor: sensors.Sensor,
    nameLabel: ui.UiLabel
    valueLabel: ui.UiLabel
    unitLabel: ui.UiLabel
  }

  type SensorAction = "sensors"

  const MAX_SELECTABLE_SENSORS = 3
  const SENSOR_ACTION_SCOPE = "live-graph/actions"
  const SENSOR_ACTION_GAP = 8
  const SENSOR_ACTION_BAND_HEIGHT = 24
  const SENSOR_ACTION_CENTER_Y = 110

  const SENSOR_READOUT_X = 4
  const SENSOR_READOUT_Y = 1
  const SENSOR_ROW_GAP = 3
  const SENSOR_VALUE_WIDTH = 30

  export class LiveSensorGraph extends ui.UiScreen {
    private tick: number
    private graphRect: ui.Rect
    private sensorInfos: SensorInfo[]
    private readout: ui.UiStack
    private nameColumn: ui.UiStack
    private valueColumn: ui.UiStack
    private unitColumn: ui.UiStack

    private onJacdacChange: () => void;

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

      this.onJacdacChange = () => this.pruneDisconnectedSensors(getAvailableMicrobitAndJacdacSensors())
    }

    public activate(): void {
      jacdac.bus.on(jacdac.DEVICE_CONNECT, this.onJacdacChange)
      jacdac.bus.on(jacdac.DEVICE_DISCONNECT, this.onJacdacChange)
    }

    public deactivate(): void {
      jacdac.bus.off(jacdac.DEVICE_CONNECT, this.onJacdacChange)
      jacdac.bus.off(jacdac.DEVICE_DISCONNECT, this.onJacdacChange)
    }

    private createActions(): ui.UiControl<SensorAction>[] {
      return [
        ui.button<SensorAction>("sensors", "Sensors", () => openSensorPicker(
          getAvailableMicrobitAndJacdacSensors,
          {
            screen: this,
            selected: () => this.sensorInfos.map(info => info.sensor),
            maxSelectableSensorNum: MAX_SELECTABLE_SENSORS,
            onPick: sensor => this.toggleSensor(sensor),
            onUnpick: index => {
              this.sensorInfos.splice(index, 1)
              this.rebuildReadout()
            },
          }
        )
        )
      ];
    }

    private pruneDisconnectedSensors(connectedSensors: sensors.Sensor[]): void {
      const connectedNames = connectedSensors.map(s => s.name);
      const stillConnected = (info: SensorInfo) => connectedNames.indexOf(info.sensor.name) >= 0;
      const removed = this.sensorInfos.some(info => !stillConnected(info));
      this.sensorInfos = this.sensorInfos.filter(stillConnected);
      if (removed) this.rebuildReadout();
    }

    private activeIndexForName(name: string): number {
      for (let i = 0; i < this.sensorInfos.length; i++) {
        if (this.sensorInfos[i].sensor.name == name)
          return i
      }
      return -1
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

    // Toggles a sensor channel on or off. Selection is keyed by sensor name.
    private toggleSensor(sensor: sensors.Sensor): void {
      const idx = this.activeIndexForName(sensor.name)
      if (idx >= 0) {
        this.sensorInfos.splice(idx, 1)
      } else {
        // The picker locks these out, but guard the array regardless.
        if (this.sensorInfos.length >= MAX_SELECTABLE_SENSORS) return
        const nameLabel = new ui.UiLabel(sensor.name, 1)
        const valueLabel = new ui.UiLabel({
          text: "--",
          color: 1,
          size: { width: SENSOR_VALUE_WIDTH },
        })
        const unitLabel = new ui.UiLabel(`${sensor.unitSymbol}`, 1)
        nameLabel.setColor(15)
        unitLabel.setColor(15)
        this.sensorInfos.push({ sensor, nameLabel, valueLabel, unitLabel })
      }
      this.rebuildReadout()
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
          const x = this.graphRect.x + 2 + Math.idiv(i * (this.graphRect.width - 4), values.length - 1)
          const y = this.graphRect.y + this.graphRect.height - 3 - Math.idiv((values[i] - sensor.min) * (this.graphRect.height - 6), range);

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
