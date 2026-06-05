namespace microdata {
  export class Home extends ui.UiScreen {
    private btns: ui.UiButton[];

    constructor(runtime: ui.UiRuntime) {
      super(runtime);

      this.btns = [
        new ui.UiButton({
          id: "btn1",
          focusLabel: "Real-time Data",
          bitmap: linearGraph1,
          onActivate: () => {
            this.runtime.pop()
          },
          style: ui.UiButtonStyles.Transparent,
          size: { width: 30, height: 30 }
        }),

        new ui.UiButton({
          id: "btn2",
          focusLabel: "Log Data",
          bitmap: largeEditIcon,
          onActivate: () => {
            this.runtime.pop()
          },
          style: ui.UiButtonStyles.Transparent,
          size: { width: 30, height: 30 }
        }),

        new ui.UiButton({
          id: "btn3",
          focusLabel: "Command Mode",
          bitmap: radio_set_group,
          onActivate: () => {
            this.runtime.pop()
          },
          style: ui.UiButtonStyles.Transparent,
          size: { width: 30, height: 30 }
        }),

        new ui.UiButton({
          id: "btn4",
          focusLabel: "View Data & Settings",
          bitmap: largeDisk,
          onActivate: () => {
            this.runtime.pop()
          },
          style: ui.UiButtonStyles.Transparent,
          size: { width: 30, height: 30 }
        })
      ];

      const centerY: number = ui.STANDARD_DISPLAY_HEIGHT - 32;
      this.btns.forEach((btn, idx) => this.add(btn, { centerX: 20 + (40 * idx), centerY }));
    }

    // What do we think about handling left/right this way?
    // What about the btn ids "btn1", "btn2", etc? Should these be local names?
    // It feels very responsive which is great.
    // How can I reduce the repeat tick speed?
    //
    // Text label Z-height is wrong
    public handleInput(event: ui.UiInputEvent): boolean | undefined {
      let handled = super.handleInput(event);
      if (handled !== undefined) return handled;

      const ids = this.btns.map(b => b.scopeId)
      const idx = ids.indexOf(this.focus.getActiveScopeId())

      if (idx === -1) return undefined // Maybe we want it to crash?

      if (event.action === "left" && (event.phase === "pressed" || event.phase === "repeated" )) {
        this.focus.setActiveScope(ids[(idx - 1 + this.btns.length) % this.btns.length]); return true;
      }

      if (event.action === "right" && (event.phase === "pressed" || event.phase === "repeated")) {
        this.focus.setActiveScope(ids[(idx + 1) % this.btns.length]); return true;
      }

      return undefined;
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
        microbitLogo,
        ((ui.STANDARD_DISPLAY_WIDTH - microbitLogo.width) >> 1) + dy,
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

      super.render(surface) // btns
    }
  }
}
