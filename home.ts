namespace microdata {
  type HomeAction = "realtime" | "log" | "command" | "view"

  const HOME_ACTION_SCOPE = "home/actions"
  const HOME_ACTION_SIZE = 30
  const HOME_ACTION_GAP = 10
  const HOME_ACTION_CENTER_Y = ui.STANDARD_DISPLAY_HEIGHT - 32

  export class Home extends ui.UiScreen {
    constructor(runtime: ui.UiRuntime) {
      super(runtime);

      const actions = new ui.UiRow<HomeAction>({
        scopeId: HOME_ACTION_SCOPE,
        controls: this.createActions(),
        controlSize: { width: HOME_ACTION_SIZE, height: HOME_ACTION_SIZE },
        gap: HOME_ACTION_GAP,
        controlStyle: ui.UiButtonStyles.Transparent,
        labelBounds: new ui.Rect(
          0,
          0,
          ui.STANDARD_DISPLAY_WIDTH,
          ui.STANDARD_DISPLAY_HEIGHT
        ),
        wrap: true,
      });

      this.addCentered(
        actions,
        HOME_ACTION_CENTER_Y,
        ui.STANDARD_DISPLAY_WIDTH,
        HOME_ACTION_SIZE
      );
    }

    private createActions(): ui.UiControl<HomeAction>[] {
      return [
        this.action("realtime", ui.linearGraph1, "Real-time Data", () =>
          this.runtime.push(new LiveSensorGraph(this.runtime))
        ),
        this.action("log", ui.largeEditIcon, "Log Data", () => this.runtime.push(new SensorLoggingSetup(this.runtime))),
        this.action("command", ui.radio_set_group, "Command Mode", () =>
          this.runtime.pop()
        ),
        this.action("view", ui.largeDisk, "View Data & Settings", () =>
          this.runtime.pop()
        ),
      ];
    }

    // The row owns a single focus scope and arranges its controls; left/right
    // navigation and activation are handled by the focus runtime, so no
    // handleInput override is needed here.
    private action(
      id: HomeAction,
      bitmap: Bitmap,
      focusLabel: string,
      onActivate: () => void
    ): ui.UiControl<HomeAction> {
      const control = ui.button<HomeAction>(id, { bitmap }, onActivate);
      control.focusLabel = focusLabel;
      return control;
    }

    private yOffset = -ui.STANDARD_DISPLAY_HEIGHT >> 1
    render(surface: ui.DrawSurface): void {
      this.yOffset = Math.min(0, this.yOffset + 2)
      const t = control.millis()
      const dy = this.yOffset == 0 ? (Math.idiv(t, 800) & 1) - 1 : 0
      const margin = 2
      const OFFSET = (ui.STANDARD_DISPLAY_HEIGHT >> 1) - microdataLogo.height - margin - 9
      const y = OFFSET

      surface.clear(0xC);

      surface.drawBitmap(
        microdataLogo,
        ((ui.STANDARD_DISPLAY_WIDTH - microdataLogo.width) >> 1) + dy,
        y + this.yOffset
      );

      surface.drawBitmap(
        ui.microbitLogo,
        ((ui.STANDARD_DISPLAY_WIDTH - ui.microbitLogo.width) >> 1) + dy,
        y - microdataLogo.height + this.yOffset + margin
      );

      if (!this.yOffset) {
        const size: ui.Size = surface.measureText("direct", bitmaps.font8)
        surface.drawText(
          "Mini-measurer",
          ((ui.STANDARD_DISPLAY_WIDTH + microdataLogo.width) >> 1) + dy - (size.width << 1),
          OFFSET + microdataLogo.height + dy + this.yOffset + 3,
          { color: 1, font: bitmaps.font8 }
        )
      }

      // draw version:
      const font = bitmaps.font5
      const text = "v1.9.0"
      const size: ui.Size = surface.measureText("direct", font)

      surface.drawText(
        text,
        ui.STANDARD_DISPLAY_WIDTH - size.width,
        ui.STANDARD_DISPLAY_HEIGHT - size.height - 2,
        { color: 0xb, font }
      )

      super.render(surface) // row of action buttons
    }
  }
}
