namespace microdata {
  import Screen = user_interface_base.Screen
  import Scene = user_interface_base.Scene
  import AppInterface = user_interface_base.AppInterface
  import font = user_interface_base.font

  /**
   * Display limits
   * Data in excess will require scrolling to view
   * Includes header row
   */
  const TABULAR_MAX_ROWS = 8

  /**
   * Locally used to control flow upon button presses: A, B, UP, DOWN
   */
  const enum DATA_VIEW_DISPLAY_MODE {
    /** Show all data from all sensors. DEFAULT + State transition on B Press */
    UNFILTERED_DATA_VIEW,
    /** Show the data from one selected sensors. State transition on A Press */
    FILTERED_DATA_VIEW,
  }

  /**
   * Used to view the information stored in the data logger
   * Shows up to TABULAR_MAX_ROWS rows ordered by period descending.
   * Shows the datalogger's header as the first row.
   * UP, DOWN, LEFT, RIGHT to change rows & columns.
   * Pressing shows all rows by the same sensor (filters the data)
   */
  export class TabularDataViewer extends Scene {
    /** Should the TabularDataViewer update dataRows on the next frame? Used by the DistributedLoggingProtocol to tell this screen to update dataRows when a new log is made in realtime */
    public static updateDataRowsOnNextFrame: boolean = false

    /** First row in the datalogger; always the first row in dataRows and thus always displayed at the top of the screen, even if scrolling past it. See .nextDataChunk() */
    public static dataLoggerHeader: string[];

    /**
     * Used to store a chunk of data <= TABULAR_MAX_ROWS in length.
     * Either filtered or unfiltered data.
     * Fetched on transition between states when pressing A or B.
     * Or scrolling UP & DOWN
     * 
     * Only modified by:
     *      .nextDataChunk() &
     *      .nextFilteredDataChunk()
     */
    private static dataRows: string[][];


    //---------
    // FOR GUI:
    //---------

    /**
     * Needed to centre the headers in .draw()
     * No need to calculate once per frame
     */
    private headerStringLengths: number[];

    /**
     * Unfiltered at startJac Moist.
     * Pressing A sets to Filtered
     * Pressing B sets to Unfiltered
     */
    private guiState: DATA_VIEW_DISPLAY_MODE;

    /**
     * Will this viewer need to scroll to reveal all of the rows?
     */
    private static needToScroll: boolean

    /**
     * User modified column index; via UP & DOWN.
     * 
     * Cursor location, when the cursor is on the first or last row 
     * and UP or DOWN is invoked this.currentRowOffset is modified once instead.
     * Modified when pressing UP or DOWN
     */
    private currentRow: number

    /**
     * User modified column index; via LEFT & RIGHT.
     * 
     * Used to determine which columns to draw.
     */
    private currentCol: number

    /**
     * Used as index into .filteredReadStarts by:
     *      .nextDataChunk() &
     *      .nextFilteredDataChunk()
     * If .currentRow is on the first or last row this is modified
     * causing the next chunk of data to be offset by 1.
     * 
     * Modified when pressing UP or DOWN
     */
    private static currentRowOffset: number

    /**
     * This is unique per sensor, it is calculated once upon pressing A.
     */
    private numberOfFilteredRows: number

    /**
     * Set when pressing A, filtered against in this.nextFilteredDataChunk()
     */
    private filteredValue: string


    /** Which column did the user press A on? Corresponds to this.filteredValue */
    private filteredCol: number;

    /**
     * There may be any number of sensors, and each may have a unique period & number of measurements.
     * Data is retrieved in batches via datalogger.getRow():
     *      so it is neccessary to start at the index of the last filtered read.
     * This array is a lookup for where to start reading from - using this.yScrollOffset as index
     */
    private filteredReadStarts: number[]

    /** TabularDataViewer may be entered from the Command Mode, DataViewSelect or View Data (Home screen 4th button) */
    private goBack1PageFn: () => void

    constructor(app: AppInterface, goBack1PageFn: () => void) {
      super(app, "recordedDataViewer")

      this.guiState = DATA_VIEW_DISPLAY_MODE.UNFILTERED_DATA_VIEW
      TabularDataViewer.needToScroll = datalogger.getNumberOfRows() > TABULAR_MAX_ROWS

      // Start on the 2nd row; since the first row is for headers:
      this.currentRow = 1
      this.currentCol = 0

      this.numberOfFilteredRows = 0

      this.filteredValue = ""
      this.filteredReadStarts = [0]
      this.filteredCol = 0

      this.goBack1PageFn = goBack1PageFn
    }

        /* override */ startup() {
      super.startup()
      basic.pause(50);

      TabularDataViewer.currentRowOffset = 0
      TabularDataViewer.dataLoggerHeader = datalogger.getRows(TabularDataViewer.currentRowOffset, 1).split("\n")[0].split(",");
      TabularDataViewer.currentRowOffset = 1
      TabularDataViewer.nextDataChunk();

      this.headerStringLengths = TabularDataViewer.dataLoggerHeader.map((header) => (header.length + 5) * font.charWidth)

      //----------
      // Controls:
      //----------

      control.onEvent(
        ControllerButtonEvent.Pressed,
        controller.B.id,
        () => {
          if (this.guiState == DATA_VIEW_DISPLAY_MODE.FILTERED_DATA_VIEW) {
            TabularDataViewer.currentRowOffset = 1
            this.currentRow = 1

            TabularDataViewer.nextDataChunk();
            this.guiState = DATA_VIEW_DISPLAY_MODE.UNFILTERED_DATA_VIEW
          }
          else {
            this.goBack1PageFn()
          }
        }
      )

      control.onEvent(
        ControllerButtonEvent.Pressed,
        controller.A.id,
        () => {
          if (this.guiState == DATA_VIEW_DISPLAY_MODE.UNFILTERED_DATA_VIEW) {
            this.filteredCol = this.currentCol;
            this.filteredValue = TabularDataViewer.dataRows[this.currentRow][this.filteredCol]

            TabularDataViewer.currentRowOffset = 0
            this.currentRow = 1

            this.nextFilteredDataChunk();
            this.updateNeedToScroll();
            this.guiState = DATA_VIEW_DISPLAY_MODE.FILTERED_DATA_VIEW
          }
        }
      )

      control.onEvent(
        ControllerButtonEvent.Pressed,
        controller.up.id,
        () => {
          let tick = true;
          control.onEvent(
            ControllerButtonEvent.Released,
            controller.up.id,
            () => tick = false
          )


          // Control logic:
          while (tick) {
            if (this.currentRow > 0)
              this.currentRow = Math.max(this.currentRow - 1, 1);

            /**
             * When scrolling up the cursor might be at the bottom of the screen; so just move the cursor up one.
             * Or, the cursor could be on the 2nd row of the screen (index 1 since the first row are headers):
             *      So don't move the cursor, load a new chunk of data.
             */
            if (TabularDataViewer.needToScroll && this.currentRow == 1) {
              TabularDataViewer.currentRowOffset = Math.max(TabularDataViewer.currentRowOffset - 1, 1);

              if (this.guiState == DATA_VIEW_DISPLAY_MODE.UNFILTERED_DATA_VIEW) {
                TabularDataViewer.currentRowOffset = Math.max(TabularDataViewer.currentRowOffset - 1, 1);
                TabularDataViewer.nextDataChunk();
              }
              else {
                TabularDataViewer.currentRowOffset = Math.max(TabularDataViewer.currentRowOffset - 1, 0);
                this.nextFilteredDataChunk()
              }
            }

            basic.pause(100)
          }

          // Reset binding
          control.onEvent(ControllerButtonEvent.Released, controller.up.id, () => { })
        }
      )

      control.onEvent(
        ControllerButtonEvent.Pressed,
        controller.down.id,
        () => {
          let tick = true;
          control.onEvent(
            ControllerButtonEvent.Released,
            controller.down.id,
            () => tick = false
          );

          // Control logic:
          while (tick) {
            let rowQty = (TabularDataViewer.dataRows.length < TABULAR_MAX_ROWS) ? TabularDataViewer.dataRows.length - 1 : datalogger.getNumberOfRows();

            /**
             * Same situation as when scrolling UP:
             * When scrolling down the cursor might be at the top of the screen; so just move the cursor down one.
             * Or, the cursor could be on the last row of the screen:
             *      So don't move the cursor, load a new chunk of data.
             */

            // Boundary where there are TABULAR_MAX_ROWS - 1 number of rows:
            if (datalogger.getNumberOfRows() == TABULAR_MAX_ROWS)
              rowQty = TABULAR_MAX_ROWS - 1

            if (this.guiState == DATA_VIEW_DISPLAY_MODE.FILTERED_DATA_VIEW)
              rowQty = this.numberOfFilteredRows

            if (TabularDataViewer.needToScroll) {
              if (this.currentRow + 1 < TABULAR_MAX_ROWS)
                this.currentRow += 1;

              else if (TabularDataViewer.currentRowOffset <= rowQty - TABULAR_MAX_ROWS - 1) {
                TabularDataViewer.currentRowOffset += 1;

                if (this.guiState == DATA_VIEW_DISPLAY_MODE.UNFILTERED_DATA_VIEW)
                  TabularDataViewer.nextDataChunk();
                else
                  this.nextFilteredDataChunk()
              }
            }

            else if (this.currentRow < rowQty) {
              this.currentRow += 1;
            }
            basic.pause(100)
          }
          control.onEvent(ControllerButtonEvent.Released, controller.down.id, () => { })
        }
      )

      control.onEvent(
        ControllerButtonEvent.Pressed,
        controller.left.id,
        () => {
          this.currentCol = Math.max(this.currentCol - 1, 0)
        }
      )

      control.onEvent(
        ControllerButtonEvent.Pressed,
        controller.right.id,
        () => {
          if (this.currentCol + 1 < TabularDataViewer.dataRows[0].length - 1)
            this.currentCol += 1
        }
      )
    }


    //----------------
    // STATIC METHODS:
    //----------------

    public static updateDataChunks() {
      TabularDataViewer.nextDataChunk()
    }

    /**
     * Used to retrieve the next chunk of data.
     * Invoked when this.tabularYScrollOffset reaches its screen boundaries.
     * Mutates: this.dataRows
     */
    private static nextDataChunk() {
      const rows = datalogger.getRows(TabularDataViewer.currentRowOffset, TABULAR_MAX_ROWS).split("\n");
      TabularDataViewer.needToScroll = datalogger.getNumberOfRows() > TABULAR_MAX_ROWS

      let nextDataChunk = [TabularDataViewer.dataLoggerHeader]
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] != "")
          nextDataChunk.push(rows[i].split(","));
      }
      TabularDataViewer.dataRows = nextDataChunk
    }


    //-------------------------------
    // Non static Data Chunk methods:
    //-------------------------------


    /**
     * Fill this.dataRows with up to TABULAR_MAX_ROWS elements of data.
     * Filter rows by this.filteredValue.
     * Sets the next filteredReadStart by setting this.filteredReadStarts[this.yScrollOffset + 1]
     * Mutates: this.dataRows
     * Mutates: this.filteredReadStarts[this.yScrollOffset + 1]
     */
    private nextFilteredDataChunk() {
      let start = this.filteredReadStarts[TabularDataViewer.currentRowOffset];

      let nextFilteredDataChunk = [TabularDataViewer.dataLoggerHeader]
      // if (TabularDataViewer.currentRowOffset == 0)
      //     TabularDataViewer.dataRows.push(datalogger.getRows(1, 1).split("\n")[0].split(",")); // 0 -> 1;

      while (start < datalogger.getNumberOfRows() && nextFilteredDataChunk.length < TABULAR_MAX_ROWS) {
        const rows = datalogger.getRows(start, TABULAR_MAX_ROWS).split("\n"); // each row as 1 string

        // Turn each row into a column of data:
        for (let i = 0; i < rows.length; i++) {
          const cols = rows[i].split(",");

          // Only add if it's what we're looking for:
          if (cols[this.filteredCol] == this.filteredValue) {
            nextFilteredDataChunk.push(cols);

            // Document where this read started from, so the next read starts in the correct position:
            // Either 3 or 2; since the first read has headers (1 additional row):
            if (nextFilteredDataChunk.length == ((TabularDataViewer.currentRowOffset == 0) ? 3 : 2)) {
              this.filteredReadStarts[TabularDataViewer.currentRowOffset + 1] = start + i
            }
          }
        }
        start += Math.min(TABULAR_MAX_ROWS, datalogger.getNumberOfRows(start))
      }

      TabularDataViewer.dataRows = nextFilteredDataChunk
    }


    /**
     * Set this.numberOfFilteredRows & this.needToScroll 
     * Based upon this.filteredValue
     */
    private updateNeedToScroll() {
      const chunkSize = Math.min(20, datalogger.getNumberOfRows()); // 20 as limit for search

      this.numberOfFilteredRows = 0
      for (let chunk = 0; chunk < datalogger.getNumberOfRows(); chunk += chunkSize) {
        const rows = datalogger.getRows(chunk, chunkSize).split("\n");
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].split(",", 1)[this.filteredCol] == this.filteredValue) {
            this.numberOfFilteredRows += 1
          }
        }
      }

      // Are there more rows that we could display?
      TabularDataViewer.needToScroll = this.numberOfFilteredRows > TABULAR_MAX_ROWS
    }


    /**
     * Each header and its corresopnding rows of data have variable lengths,
     *      The small screen sizes exaggerates these differences, hence variable column sizing.
     * @param colBufferSizes this.headerStringLengths spliced by this.xScrollOffset
     * @param rowBufferSize remains constant
     */
    drawGridOfVariableColSize(colBufferSizes: number[], rowBufferSize: number) {
      let cumulativeColOffset = 0

      // Skip the first column: Time (Seconds):
      for (let col = 0; col < colBufferSizes.length; col++) {
        if (cumulativeColOffset + colBufferSizes[col] > Screen.WIDTH) {
          break
        }

        // The last column should use all remaining space, if it is lesser than that remaining space:
        if (col == colBufferSizes.length - 1 || cumulativeColOffset + colBufferSizes[col] + colBufferSizes[col + 1] > Screen.WIDTH)
          cumulativeColOffset += Screen.WIDTH - cumulativeColOffset;
        else
          cumulativeColOffset += colBufferSizes[col];

        if (cumulativeColOffset <= Screen.WIDTH) {
          Screen.drawLine(
            Screen.LEFT_EDGE + cumulativeColOffset,
            Screen.TOP_EDGE,
            Screen.LEFT_EDGE + cumulativeColOffset,
            Screen.HEIGHT,
            15
          )
        }
      }

      for (let rowOffset = 0; rowOffset <= Screen.HEIGHT; rowOffset += rowBufferSize) {
        Screen.drawLine(
          Screen.LEFT_EDGE,
          Screen.TOP_EDGE + rowOffset,
          Screen.WIDTH,
          Screen.TOP_EDGE + rowOffset,
          15
        )
      }

      // Draw selected box:
      Screen.drawRect(
        Screen.LEFT_EDGE,
        Screen.TOP_EDGE + (this.currentRow * rowBufferSize),
        colBufferSizes[0],
        rowBufferSize,
        6
      )
    }

    draw() {
      Screen.fillRect(
        Screen.LEFT_EDGE,
        Screen.TOP_EDGE,
        Screen.WIDTH,
        Screen.HEIGHT,
        0xC
      )

      if (TabularDataViewer.updateDataRowsOnNextFrame)
        TabularDataViewer.nextDataChunk()


      // Could be optimised by calculating the Col line boundaries once & re-using them, instead of each frame:
      const tabularRowBufferSize = Screen.HEIGHT / Math.min(TabularDataViewer.dataRows.length, TABULAR_MAX_ROWS);
      this.drawGridOfVariableColSize(this.headerStringLengths.slice(this.currentCol), tabularRowBufferSize)

      // Write the data into the grid:
      for (let row = 0; row < Math.min(TabularDataViewer.dataRows.length, TABULAR_MAX_ROWS); row++) {
        let cumulativeColOffset = 0;

        // Go through each column:
        for (let col = 0; col < TabularDataViewer.dataRows[0].length - this.currentCol; col++) {
          const colID: number = col + this.currentCol;

          let columnValue: string = TabularDataViewer.dataRows[row][colID];

          // Bounds check:
          if (cumulativeColOffset + this.headerStringLengths[colID] > Screen.WIDTH)
            break;

          // In this.drawGridOfVariableSize: If the column after this one would not fit grant this one the remanining space
          // This will align the text to the center of this column space
          if (colID == TabularDataViewer.dataRows[0].length - 1 || cumulativeColOffset + this.headerStringLengths[colID] + this.headerStringLengths[colID + 1] > Screen.WIDTH)
            cumulativeColOffset += ((Screen.WIDTH - cumulativeColOffset) >> 1) - (this.headerStringLengths[colID] >> 1);

          // Write the columnValue in the centre of each grid box:
          Screen.print(
            columnValue,
            Screen.LEFT_EDGE + cumulativeColOffset + (this.headerStringLengths[colID] >> 1) - ((font.charWidth * columnValue.length) >> 1),
            Screen.TOP_EDGE + (row * tabularRowBufferSize) + (tabularRowBufferSize >> 1) - 4,
            // 0xb,
            1,
            bitmaps.font8
          )

          cumulativeColOffset += this.headerStringLengths[colID]
        }
      }

      super.draw()
    }
  }
}
