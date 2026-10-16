namespace microdata {
  const TABULAR_MAX_ROWS = 8
  const TABULAR_LOAD_QTY = 250

  export class TabularDataViewer extends ui.UiScreen {
    private header: string[]
    private allRows: string[][]
    private view: string[][]
    private colWidths: number[]
    private selected = 0
    private rowOffset = 0
    private cursorCol = 0
    private filterCol = 0
    private filterValue: string = undefined

    constructor(runtime: ui.UiRuntime) {
      super(runtime)

      // Reading the log before its filesystem has been mounted returns garbage:
      datalogger.includeTimestamp(FlashLogTimeStampFormat.Seconds)

      const total = datalogger.getNumberOfRows()
      const rows: string[][] = []
      for (let start = 0; start < total; start += TABULAR_LOAD_QTY) {
        const lines = datalogger.getRows(start, Math.min(TABULAR_LOAD_QTY, total - start)).split("\n")
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].length === 0) continue
          const cells = lines[i].split(",")
          for (let c = 0; c < cells.length; c++) cells[c] = this.cleanCell(cells[c])
          rows.push(cells)
        }
      }

      this.header = rows.length > 0 ? rows.shift() : []
      this.allRows = rows

      const charW = bitmaps.font8.charWidth
      this.colWidths = []
      for (let c = 0; c < this.header.length; c++) {
        let maxLen = this.header[c].length
        for (let r = 0; r < this.allRows.length; r++) {
          const cell = this.allRows[r][c]
          if (cell !== undefined && cell.length > maxLen) maxLen = cell.length
        }
        this.colWidths.push((maxLen + 2) * charW)
      }

      this.rebuild()
    }

    private cleanCell(cell: string): string {
      let out = ""
      for (let i = 0; i < cell.length; i++) {
        const code = cell.charCodeAt(i)
        if (code >= 32 && code <= 126) out += cell.charAt(i)
      }
      return out
    }

    public handleInput(event: ui.UiInputEvent): undefined | boolean {
      const phase = event.phase || "pressed"
      switch (event.action) {
        case "cancel":
          if (phase !== "pressed") return undefined
          if (this.filterValue !== undefined) {
            this.filterValue = undefined
            this.rebuild()
          } else {
            this.runtime.pop()
          }
          return true
        case "activate":
          if (phase !== "pressed") return undefined
          if (this.filterValue === undefined && this.view.length > 0) {
            this.filterCol = this.cursorCol
            this.filterValue = this.view[this.selected][this.cursorCol]
            this.rebuild()
          }
          return true
        case "up":
          if (phase !== "pressed" && phase !== "repeated") return undefined
          if (this.selected > 0) this.selected--
          if (this.selected < this.rowOffset) this.rowOffset = this.selected
          return true
        case "down":
          if (phase !== "pressed" && phase !== "repeated") return undefined
          if (this.selected < this.view.length - 1) {
            this.selected++
            if (this.selected >= this.rowOffset + TABULAR_MAX_ROWS - 1)
              this.rowOffset = this.selected - (TABULAR_MAX_ROWS - 1) + 1
          }
          return true
        case "left":
          if (phase !== "pressed") return undefined
          this.cursorCol = Math.max(0, this.cursorCol - 1)
          return true
        case "right":
          if (phase !== "pressed") return undefined
          this.cursorCol = Math.min(this.header.length - 1, this.cursorCol + 1)
          return true
      }
      return undefined
    }

    private rebuild(): void {
      this.view = this.filterValue === undefined
        ? this.allRows
        : this.allRows.filter(row => row[this.filterCol] === this.filterValue)
      this.selected = 0
      this.rowOffset = 0
    }

    public render(surface: ui.DrawSurface): void {
      surface.clear(0xC)

      const visibleRows = Math.min(this.view.length, TABULAR_MAX_ROWS - 1)
      const rowCount = visibleRows + 1
      const rowH = Math.idiv(ui.STANDARD_DISPLAY_HEIGHT, rowCount)

      surface.fillRect(
        new ui.Rect(0, (this.selected - this.rowOffset + 1) * rowH, ui.STANDARD_DISPLAY_WIDTH, rowH),
        6
      )

      let x = 0
      for (let c = this.cursorCol; c < this.header.length; c++) {
        if (x + this.colWidths[c] > ui.STANDARD_DISPLAY_WIDTH) break
        const lastVisible = c + 1 === this.header.length ||
          x + this.colWidths[c] + this.colWidths[c + 1] > ui.STANDARD_DISPLAY_WIDTH
        x += lastVisible ? ui.STANDARD_DISPLAY_WIDTH - x : this.colWidths[c]
        surface.drawLine(x, 0, x, ui.STANDARD_DISPLAY_HEIGHT - 1, 15)
      }
      for (let r = 0; r <= rowCount; r++)
        surface.drawLine(0, r * rowH, ui.STANDARD_DISPLAY_WIDTH, r * rowH, 15)

      const charWidth = bitmaps.font8.charWidth
      for (let r = 0; r <= visibleRows; r++) {
        const row = r === 0 ? this.header : this.view[this.rowOffset + r - 1]
        const isCursorRow = r - 1 === this.selected - this.rowOffset
        let cx = 0
        for (let c = this.cursorCol; c < this.header.length; c++) {
          const w = this.colWidths[c]
          if (cx + w > ui.STANDARD_DISPLAY_WIDTH) break
          const lastVisible = c + 1 === this.header.length ||
            cx + w + this.colWidths[c + 1] > ui.STANDARD_DISPLAY_WIDTH
          if (row[c] !== undefined) {
            const value = row[c]
            const textW = value.length * charWidth
            const cellW = lastVisible ? ui.STANDARD_DISPLAY_WIDTH - cx : w
            surface.drawText(
              value,
              cx + Math.max(0, Math.idiv(cellW - textW, 2)),
              r * rowH + (rowH >> 1) - 4,
              { color: isCursorRow ? 15 : 1 }
            )
          }
          cx += lastVisible ? ui.STANDARD_DISPLAY_WIDTH - cx : w
        }
      }
    }
  }
}
