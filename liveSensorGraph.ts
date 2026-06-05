namespace microdata {
  export class LiveSensorGraph extends ui.UiScreen {
    private state: "running" | "adding sensor"
    private values: number[]
    private tick: number
    private graphRect: ui.Rect
    private valueLabel: ui.UiLabel
    private addSensorBtn: ui.UiButton

    // private sensors: Sensor[];

    // Shorter btn at bottom, with "+" for adding sensor
    // Added sensors appear as btns too, they can be removed by pressing them
    // No longer show units or legend on the graph, rather show the value + units in a label

    constructor(runtime: ui.UiRuntime) {
      super(runtime)
      this.backgroundColor = 0
      this.tick = 0
      this.state = "running"
      this.graphRect = new ui.Rect(8, 22, 144, 70)

      this.addSensorBtn = new ui.UiButton("addSensorBtn", "Add sensor", () => {
        this.state = "adding sensor"
      })
      this.values = [
        24, 28, 35, 40, 46, 52, 58, 63, 68, 72, 70, 66, 60, 54, 48, 42, 36,
        31, 27, 25,
      ]
      this.valueLabel = new ui.UiLabel(
        "" + this.values[this.values.length - 1],
        7,
      )
      this.add(new ui.UiLabel("Signal", 1), { x: 8, y: 6 })
      this.add(this.valueLabel, { x: 128, y: 6 })
      this.add(this.addSensorBtn, { centerX: 80, centerY: 107 });
    }

    public update(): void {
      if (this.state !== "running") return;

      this.tick += 1
      if (this.tick % 6 != 0) return;

      const phase = Math.idiv(this.tick, 6) % 20
      const wave = phase < 10 ? phase : 20 - phase
      this.values.removeAt(0)
      this.values.push(25 + wave * 6)
      this.valueLabel.setText("" + this.values[this.values.length - 1])
    }

    public render(surface: ui.DrawSurface): void {
      surface.drawRect(this.graphRect, 1)
      surface.drawLine(
        this.graphRect.x + 1,
        this.graphRect.y + Math.idiv(this.graphRect.height, 2),
        this.graphRect.x + this.graphRect.width - 2,
        this.graphRect.y + Math.idiv(this.graphRect.height, 2),
        13,
      )

      let previousX = 0
      let previousY = 0
      for (let i = 0; i < this.values.length; i++) {
        const x =
          this.graphRect.x +
          2 +
          Math.idiv(
            i * (this.graphRect.width - 4),
            this.values.length - 1,
          )
        const y =
          this.graphRect.y +
          this.graphRect.height -
          3 -
          Math.idiv(this.values[i] * (this.graphRect.height - 6), 100)

        if (i > 0) surface.drawLine(previousX, previousY, x, y, 7)
        previousX = x
        previousY = y
      }

      super.render(surface)
    }
  }
}
