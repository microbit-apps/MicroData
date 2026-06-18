namespace microdata {
  interface SensorChoice {
    sensor: sensors.MicrobitSensors;
    name: string;
  }

  type SensorInfo = {
    sensor: sensors.Sensor,
    nameLabel: ui.UiLabel
    valueLabel: ui.UiLabel
    unitLabel: ui.UiLabel
  }

  // Design objectives:
  // I wanted to get rid of the sensor select screen since people get confused by that
  // The Signal info in Eric's sample code inspired me to try put the sensor info on the same screen
  // Have a common language for button interaction, try get rid of tutorial text

  // Library comments:
  // 1. Positioning multiple labels so that they're next to each other.
  // 2. Maybe we want a way to enable different words in a label to have different colours.
  // 3. ui.UiScreen doesn't have a remove() method
  // 4. Struggled to change the modal picker shape
  // 5. Thoughts on this UI layout? Its tough to get that info on here.

  export class LiveSensorGraph extends ui.UiScreen {
    private state: "startup" | "running" | "adding sensor" | "deleting sensor"

    private tick: number
    private graphRect: ui.Rect
    private sensorInfos: SensorInfo[]
    private addSensorBtn: ui.UiButton
    private delSensorBtn: ui.UiButton

    constructor(runtime: ui.UiRuntime) {
      super(runtime)

      this.backgroundColor = 6
      this.tick = 0
      this.graphRect = new ui.Rect(8, 26, 144, 72)

      this.addSensorBtn = new ui.UiButton("addSensorBtn", "Add", () => {
        this.state = "adding sensor"
      });

      this.delSensorBtn = new ui.UiButton("delSensorBtn", "Remove", () => {
        this.state = "deleting sensor"
      });

      this.sensorInfos = []
      this.add(this.addSensorBtn, { centerX: 40, centerY: 110, height: 15 });
      this.add(this.delSensorBtn, { centerX: 120, centerY: 110, height: 15 });

      this.state = "running"
    }


    public handleInput(event: ui.UiInputEvent): undefined | boolean {
      const ids = [this.addSensorBtn.scopeId, this.delSensorBtn.scopeId]
      const idx = ids.indexOf(this.focus.getActiveScopeId())

      if (event.action === "cancel" && event.phase === "pressed" && this.state != "adding sensor") {
        this.runtime.pop();
        return true;
      }

      if (event.action == "activate" && event.phase === "pressed") {
        if (ids[idx] == this.addSensorBtn.scopeId) {
          this.state = "adding sensor"
          this.openSelectSensorsPicker()

        } else if (ids[idx] == this.delSensorBtn.scopeId && this.sensorInfos.length > 0) {
          this.state = "deleting sensor"
          const removedSensorInfo = this.sensorInfos.pop()

          this.state = "running"
        }
        return true
      }

      if (event.action === "left" && (event.phase === "pressed" || event.phase === "repeated")) {
        this.focus.setActiveScope(ids[(idx - 1 + ids.length) % ids.length]); return true;
      }

      if (event.action === "right" && (event.phase === "pressed" || event.phase === "repeated")) {
        this.focus.setActiveScope(ids[(idx + 1) % ids.length]); return true;
      }

      return undefined;
    }

    private openSelectSensorsPicker(): void {
      const uBitSensors: sensors.MicrobitSensors[] = sensors.listAllMicrobitSensors();
      const sensorNames: ui.UiControl<SensorChoice>[] =
        sensors.listAllMicrobitSensorsAsStrings().map((name: string, i: number) => ({
          id: `sensor: ${i}`,
          focusLabel: name,
          bitmap: sensorNameToBitmap(name),
          value: { sensor: uBitSensors[i], name }
        }));

      const modal = new ui.UiPicker(
        "save-dialog",
        "Select a sensor",
        sensorNames,
        choice => {
          if (this.sensorInfos.length >= 3)
            return;
          this.state = "adding sensor"

          const sensor = sensors.getMicrobitSensor(choice.sensor)
          const nameLabel = new ui.UiLabel(choice.name, 1);
          const valueLabel = new ui.UiLabel("undefined", 1);
          const unitLabel = new ui.UiLabel(`${sensor.unitSymbol}`, 1);

          const y = (this.sensorInfos.length * 8) + 1
          this.sensorInfos.push({
            sensor,
            nameLabel,
            valueLabel,
            unitLabel
          })

          nameLabel.setColor(15);
          valueLabel.setColor(2 + (this.sensorInfos.length - 1)); // Match the line graph
          unitLabel.setColor(15);
          this.add(nameLabel, { x: 4, y })

          // Trying to set location based on other labels:
          // const nameLabelMeasured = new ui.UiMeasuredSize();
          // nameLabel.measure({maxWidth: 160, maxHeight: 120}, nameLabelMeasured);
          // this.add(valueLabel, {x: nameLabelMeasured.preferredWidth, y: 4})
          this.add(valueLabel, { x: 103, y })

          // Trying to set location based on other labels:
          // const valueLabelMeasured = new ui.UiMeasuredSize();
          // valueLabel.measure({maxWidth: 160, maxHeight: 120}, valueLabelMeasured);
          // this.add(unitLabel, {x: nameLabelMeasured.preferredWidth + valueLabelMeasured.preferredWidth + 10, y: 4})
          this.add(unitLabel, { x: 140, y })

          // basic.showNumber(nameLabelMeasured.preferredWidth)
          // basic.showNumber(valueLabelMeasured.preferredWidth)

          this.state = "running"
        },
        () => {
          this.state = "running"
        },
      );

      // Trying to increase size:
      // const measured = new ui.UiMeasuredSize()
      // modal.measure({ maxWidth: 160, maxHeight: 120 }, measured)
      // modal.arrange(new ui.Rect(0, 0, measured.preferredWidth, 100))

      // modal.arrange(new ui.Rect(0, 0, 160, 100))
      // this.openModal(modal)


      // Trying to increase size v2:
      // const simpleFocus = new ui.UiFocusState()
      // const simpleController = new ui.UiFocusInputController(simpleFocus)
      // simpleFocus.setScope({ id: "simple-parent" })
      // simpleFocus.setActiveScope("simple-parent")
      this.openModal(modal)
    }

    public update(): void {
      if (this.state !== "running") return;

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
      surface.drawLine(
        this.graphRect.x + 1,
        this.graphRect.y + Math.idiv(this.graphRect.height, 2),
        this.graphRect.x + this.graphRect.width - 2,
        this.graphRect.y + Math.idiv(this.graphRect.height, 2),
        13,
      )

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
