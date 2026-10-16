namespace microdata {
  type DataViewAction = "view" | "reset"

  const DATA_VIEW_SCOPE = "data-view/actions"
  const DATA_VIEW_COLUMNS = 1
  const DATA_VIEW_WIDTH = 104
  const DATA_VIEW_HEIGHT = 24
  const DATA_VIEW_GAP = 8

  export class DataViewSelect extends ui.UiScreen {
    private hasData: boolean
    private actions: ui.UiGrid<DataViewAction>

    constructor(runtime: ui.UiRuntime) {
      super(runtime)

      this.backgroundColor = 6
      // Reading the log before its filesystem has been mounted returns garbage:
      datalogger.includeTimestamp(FlashLogTimeStampFormat.Seconds)
      this.hasData = datalogger.getNumberOfRows() > 1

      this.actions = new ui.UiGrid<DataViewAction>({
        scopeId: DATA_VIEW_SCOPE,
        controls: [
          {
            id: "view", value: "view",
            onActivate: () => this.runtime.push(new TabularDataViewer(this.runtime)),
          },
          {
            id: "reset", value: "reset",
            onActivate: () => {
              datalogger.deleteLog()
              this.hasData = false
              this.syncActions()
            },
          },
        ],
        controlSize: { width: DATA_VIEW_WIDTH, height: DATA_VIEW_HEIGHT },
        columnCount: DATA_VIEW_COLUMNS,
        controlStyle: ui.UiButtonStyles.LightShadowedWhite,
        rowGap: DATA_VIEW_GAP,
      })

      this.addCentered(
        this.actions,
        ui.STANDARD_DISPLAY_HEIGHT >> 1,
        ui.STANDARD_DISPLAY_WIDTH,
        DATA_VIEW_HEIGHT * 2 + DATA_VIEW_GAP
      )
      this.syncActions()
    }

    public handleInput(event: ui.UiInputEvent): undefined | boolean {
      if (event.action === "cancel" && event.phase === "pressed") {
        this.runtime.pop()
        return true
      }
      return undefined
    }

    private syncActions(): void {
      this.syncAction("view", this.hasData, "View Data")
      this.syncAction("reset", true, "Reset datalogger")

      this.actions.invalidateLayout()
      this.actions.registerFocusTargets(this.focus)
      this.actions.registerNavigation(this.focusInput)
    }

    private syncAction(id: DataViewAction, visible: boolean, label: string): void {
      const control = this.actions.controls.find(c => c.id === id)
      control.visible = visible
      control.focusable = visible
      control.text = label
    }

    public render(surface: ui.DrawSurface): void {
      surface.clear(0xC)

      this.drawCenteredText(surface, this.hasData ? "View Data or Clear Data" : "No data has been recorded", 5)
      if (!this.hasData)
        this.drawCenteredText(surface, "Log Data to collect some!", 20)

      super.render(surface)
    }

    private drawCenteredText(surface: ui.DrawSurface, text: string, y: number): void {
      const size = surface.measureText(text)
      const x = Math.max(0, Math.idiv(ui.STANDARD_DISPLAY_WIDTH - size.width, 2))
      surface.drawText(text, x, y, { color: 15 })
    }
  }
}
