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


  //** I think this can be far higher. Max row size is easy to calculate. */
  const MAX_ROWS_TO_CACHE = 20;

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

    private static datalogCache: string[][];


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
    private static currentRow: number

    /**
     * User modified column index; via LEFT & RIGHT.
     * 
     * Used to determine which columns to draw.
     */
    private static currentCol: number

    /**
     * Used as index into .filteredReadStarts by:
     *      .nextDataChunk() &
     *      .nextFilteredDataChunk()
     * If .currentRow is on the first or last row this is modified
     * causing the next chunk of data to be offset by 1.
     * 
     * Modified when pressing UP or DOWN
     */
    private static dataRowsIndex: number

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

    private static numberOfRows: number;

    private backBtnFn: () => void;

    constructor(app: AppInterface, backBtnFn: () => void) {
      super(app, "recordedDataViewer")

      this.guiState = DATA_VIEW_DISPLAY_MODE.UNFILTERED_DATA_VIEW

      this.numberOfFilteredRows = 0

      this.filteredValue = ""
      this.filteredReadStarts = [0]
      this.filteredCol = 0

      this.backBtnFn = backBtnFn
    }

    /* override */ startup() {
      super.startup()

      TabularDataViewer.numberOfRows = datalogger.getNumberOfRows();
      TabularDataViewer.needToScroll = TabularDataViewer.numberOfRows > TABULAR_MAX_ROWS

      // Start on the 2nd row; since the first row is for headers:
      TabularDataViewer.currentRow = 1
      TabularDataViewer.currentCol = 0

      TabularDataViewer.dataRowsIndex = 0
      TabularDataViewer.dataLoggerHeader = datalogger.getRows(TabularDataViewer.dataRowsIndex, 1).split("\n")[0].split(",");

      TabularDataViewer.fillCache();
      TabularDataViewer.dataRowsIndex = 1 // Don't start the user on the HEADER row, bump to the first row of actual data.
      TabularDataViewer.updateDataRows();

      this.headerStringLengths = TabularDataViewer.dataLoggerHeader.map((header) => (header.length + 5) * font.charWidth)

      //----------
      // Controls:
      //----------

      control.onEvent(
        ControllerButtonEvent.Pressed,
        controller.B.id,
        () => {
          if (this.guiState == DATA_VIEW_DISPLAY_MODE.FILTERED_DATA_VIEW) {
            TabularDataViewer.dataRowsIndex = 1
            TabularDataViewer.currentRow = 1

            TabularDataViewer.updateDataRows();
            this.guiState = DATA_VIEW_DISPLAY_MODE.UNFILTERED_DATA_VIEW
          }
          else {
            this.backBtnFn();
          }
        }
      )

      control.onEvent(
        ControllerButtonEvent.Pressed,
        controller.A.id,
        () => {
          if (this.guiState == DATA_VIEW_DISPLAY_MODE.UNFILTERED_DATA_VIEW) {
            this.filteredCol = TabularDataViewer.currentCol;
            this.filteredValue = TabularDataViewer.dataRows[TabularDataViewer.currentRow][this.filteredCol]

            TabularDataViewer.dataRowsIndex = 0
            TabularDataViewer.currentRow = 1

            this.nextFilteredDataChunk();
            this.updateNeedToScroll(); //NOTE:FIX
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
            if (TabularDataViewer.currentRow > 0)
              TabularDataViewer.currentRow = Math.max(TabularDataViewer.currentRow - 1, 1);

            /**
             * When scrolling up the cursor might be at the bottom of the screen; so just move the cursor up one.
             * Or, the cursor could be on the 2nd row of the screen (index 1 since the first row are headers):
             *      So don't move the cursor, load a new chunk of data.
             */
            if (TabularDataViewer.needToScroll && TabularDataViewer.currentRow == 1) {
              TabularDataViewer.dataRowsIndex = Math.max(TabularDataViewer.dataRowsIndex - 1, 1);

              if (this.guiState == DATA_VIEW_DISPLAY_MODE.UNFILTERED_DATA_VIEW) {
                TabularDataViewer.dataRowsIndex = Math.max(TabularDataViewer.dataRowsIndex - 1, 1);
                TabularDataViewer.updateDataRows();
              }
              else {
                TabularDataViewer.dataRowsIndex = Math.max(TabularDataViewer.dataRowsIndex - 1, 0);
                this.nextFilteredDataChunk()
              }
            }
            if (!controller.up.isPressed())
              break
            basic.pause(100)
          }

          // Reset binding
          control.onEvent(ControllerButtonEvent.Released, controller.up.id, () => { })
        }
      )

      // LOAD 200 rows to cacheLog
      // Copy to dataRows.
      // cacheLog pointer, currentRow pointer.

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
            // let rowQty = (TabularDataViewer.dataRows.length < TABULAR_MAX_ROWS) ? TabularDataViewer.dataRows.length - 1 : TabularDataViewer.numberOfRows;
            control.dmesg(`d: ${(TabularDataViewer.numberOfRows - TABULAR_MAX_ROWS)} ${(TabularDataViewer.dataRowsIndex + TabularDataViewer.currentRow)}`)

            if (this.guiState == DATA_VIEW_DISPLAY_MODE.UNFILTERED_DATA_VIEW) {
              if (TabularDataViewer.currentRow < TABULAR_MAX_ROWS - 1) {
                TabularDataViewer.currentRow++;
              } else if (TabularDataViewer.needToScroll) {
                TabularDataViewer.dataRowsIndex++;

                // if (TabularDataViewer.dataRowsIndex % MAX_ROWS_TO_CACHE == 0) {
                if ((TabularDataViewer.dataRowsIndex + TABULAR_MAX_ROWS - 1) % MAX_ROWS_TO_CACHE == 0) {
                  TabularDataViewer.fillCache();
                }
                TabularDataViewer.updateDataRows();
              }
            }

            /**
             * Same situation as when scrolling UP:
             * When scrolling down the cursor might be at the top of the screen; so just move the cursor down one.
             * Or, the cursor could be on the last row of the screen:
             *      So don't move the cursor, load a new chunk of data.
            */

            // Boundary where there are TABULAR_MAX_ROWS - 1 number of rows:
            // let beforeMs = control.millis()

            // if (TabularDataViewer.numberOfRows == TABULAR_MAX_ROWS)
            //   rowQty = TABULAR_MAX_ROWS - 1

            // control.dmesg(`getNumberOfRows: ${(control.millis() - beforeMs)}`)

            // if (this.guiState == DATA_VIEW_DISPLAY_MODE.FILTERED_DATA_VIEW)
            //   rowQty = this.numberOfFilteredRows
            // if (TabularDataViewer.needToScroll) {
            //   if (TabularDataViewer.currentRow + 1 < TABULAR_MAX_ROWS - 1)
            //     TabularDataViewer.currentRow += 1;

            //   else if (TabularDataViewer.currentRowOffset <= rowQty - TABULAR_MAX_ROWS) {
            //     TabularDataViewer.currentRowOffset += 1;

            //     if (this.guiState == DATA_VIEW_DISPLAY_MODE.UNFILTERED_DATA_VIEW) {
            //       if ((TabularDataViewer.currentRowOffset + TABULAR_MAX_ROWS) % MAX_ROWS_TO_CACHE == 0) {
            //         basic.showNumber(9)

            //         // -2 since we start +1 from the header, and we want to move forward again.
            //         const nextCacheStart = TabularDataViewer.currentRow - TabularDataViewer.currentRowOffset + TABULAR_MAX_ROWS - 2
            //         TabularDataViewer.fillCache(nextCacheStart);
            //       }
            //       TabularDataViewer.nextDataChunk();
            //     } else {
            //       this.nextFilteredDataChunk()
            //     }
            //   }
            // }

            // else if (TabularDataViewer.currentRow < rowQty)
            //   TabularDataViewer.currentRow += 1;

            if (!controller.down.isPressed())
              break
            basic.pause(100)
          }
          control.onEvent(ControllerButtonEvent.Released, controller.down.id, () => { })
        }
      )

      control.onEvent(
        ControllerButtonEvent.Pressed,
        controller.left.id,
        () => {
          TabularDataViewer.currentCol = Math.max(TabularDataViewer.currentCol - 1, 0)
        }
      )

      control.onEvent(
        ControllerButtonEvent.Pressed,
        controller.right.id,
        () => {
          if (TabularDataViewer.currentCol + 1 < TabularDataViewer.dataRows[0].length - 1)
            TabularDataViewer.currentCol += 1
        }
      )
    }


    //----------------
    // STATIC METHODS:
    //----------------

    // public static updateDataChunks() {
    //   TabularDataViewer.nextDataChunk()
    // }

    public static fillCache() {
      // const from = (TabularDataViewer.dataRowsIndex < 5) ? TabularDataViewer.dataRowsIndex : TabularDataViewer.dataRowsIndex - TabularDataViewer.currentRow;
      const from = TabularDataViewer.dataRowsIndex;

      // let beforeMs = control.millis()
      const rows = datalogger.getRows(from, MAX_ROWS_TO_CACHE).split("\n");
      // control.dmesg(`fcl: ${(rows.length)}`)
      // control.dmesg(`readTime: ${(control.millis() - beforeMs)}`)

      // beforeMs = control.millis()
      let nextDataChunk = [TabularDataViewer.dataLoggerHeader]
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] != "") //NOTE: neccessary check now?
          nextDataChunk.push(rows[i].split(","));
      }
      TabularDataViewer.datalogCache = nextDataChunk
      // control.dmesg(`else: ${(control.millis() - beforeMs)}`)
    }

    /**
     * Used to retrieve the next chunk of data.
     * Invoked when this.tabularYScrollOffset reaches its screen boundaries.
     * Mutates: this.dataRows
     */
    private static updateDataRows() {
      // const rows = datalogger.getRows(TabularDataViewer.currentRowOffset, TABULAR_MAX_ROWS).split("\n");
      // TabularDataViewer.needToScroll = datalogger.getNumberOfRows() > TABULAR_MAX_ROWS
      //
      // let nextDataChunk = [TabularDataViewer.dataLoggerHeader]
      // for (let i = 0; i < rows.length; i++) {
      //   if (rows[i][0] != "")
      //     nextDataChunk.push(rows[i].split(","));
      // }
      // TabularDataViewer.dataRows = nextDataChunk


      // control.dmesg(`b: ${(control.millis())}`)
      // TabularDataViewer.needToScroll = TabularDataViewer.numberOfRows > TABULAR_MAX_ROWS
      // TabularDataViewer.needToScroll = TabularDataViewer.numberOfRows - TABULAR_MAX_ROWS > TabularDataViewer.dataRowsIndex + TabularDataViewer.currentRow // YES
      // if (!TabularDataViewer.needToScroll)
      //   basic.showNumber(5)

      // const nextCacheStart = TabularDataViewer.currentRow - TabularDataViewer.currentRowOffset + TABULAR_MAX_ROWS - 2
      // const endIndex = TabularDataViewer.currentRowOffset + TabularDataViewer.currentRow + TABULAR_MAX_ROWS;

      // const numTimesCachFilled = Math.floor((TabularDataViewer.currentRowOffset + TabularDataViewer.currentRow - 2) / MAX_ROWS_TO_CACHE)
      // const start = TabularDataViewer.currentRowOffset - (MAX_ROWS_TO_CACHE * (numTimesCachFilled + 0));
      // const start = TabularDataViewer.currentRowOffset % (MAX_ROWS_TO_CACHE + TabularDataViewer.currentRow);


      // YES to 3:
      // const start = TabularDataViewer.dataRowsIndex;
      // const end = start + TABULAR_MAX_ROWS;
      // TabularDataViewer.dataRows = TabularDataViewer.datalogCache.slice(start, end)

      // control.dmesg(`s: ${(start)}, ${(end)}`)
      // control.dmesg(`a: ${(TabularDataViewer.dataRows.length)}, ${(TabularDataViewer.datalogCache.length)}`)
      // control.dmesg(`a: ${(control.millis())}`)


      // control.dmesg(`a: ${(TabularDataViewer.needToScroll)} ${(TabularDataViewer.dataRows.length)} ${(TabularDataViewer.datalogCache.length)}`)
      //
      // Balance this eq:
      // control.dmesg(`d: ${(TabularDataViewer.numberOfRows)} ${(TabularDataViewer.dataRowsIndex - TABULAR_MAX_ROWS)}`)
      control.dmesg(`u: ${(TabularDataViewer.numberOfRows)} ${(TabularDataViewer.dataRowsIndex - TABULAR_MAX_ROWS)} ${(TabularDataViewer.numberOfRows)}`)
      TabularDataViewer.needToScroll = TabularDataViewer.dataRowsIndex + TabularDataViewer.currentRow < TabularDataViewer.numberOfRows // YES
      // TabularDataViewer.needToScroll = TabularDataViewer.dataRowsIndex + TabularDataViewer.currentRow < MAX_ROWS_TO_CACHE // YES

      const start = TabularDataViewer.dataRowsIndex % MAX_ROWS_TO_CACHE;
      const end = start + TABULAR_MAX_ROWS;
      TabularDataViewer.dataRows = TabularDataViewer.datalogCache.slice(start, end)
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
      let start = this.filteredReadStarts[TabularDataViewer.dataRowsIndex];

      let nextFilteredDataChunk = [TabularDataViewer.dataLoggerHeader]
      // if (TabularDataViewer.currentRowOffset == 0)
      //     TabularDataViewer.dataRows.push(datalogger.getRows(1, 1).split("\n")[0].split(",")); // 0 -> 1;

      while (start < TabularDataViewer.numberOfRows && nextFilteredDataChunk.length < TABULAR_MAX_ROWS) {
        const rows = datalogger.getRows(start, TABULAR_MAX_ROWS).split("\n"); // each row as 1 string

        // Turn each row into a column of data:
        for (let i = 0; i < rows.length; i++) {
          const cols = rows[i].split(",");

          // Only add if it's what we're looking for:
          if (cols[this.filteredCol] == this.filteredValue) {
            nextFilteredDataChunk.push(cols);

            // Document where this read started from, so the next read starts in the correct position:
            // Either 3 or 2; since the first read has headers (1 additional row):
            if (nextFilteredDataChunk.length == ((TabularDataViewer.dataRowsIndex == 0) ? 3 : 2)) {
              this.filteredReadStarts[TabularDataViewer.dataRowsIndex + 1] = start + i
            }
          }
        }
        start += Math.min(TABULAR_MAX_ROWS, TabularDataViewer.numberOfRows)
      }

      TabularDataViewer.dataRows = nextFilteredDataChunk
    }


    /**
     * Set this.numberOfFilteredRows & this.needToScroll 
     * Based upon this.filteredValue
     */
    private updateNeedToScroll() {
      const chunkSize = Math.min(20, TabularDataViewer.numberOfRows); // 20 as limit for search

      this.numberOfFilteredRows = 0
      for (let chunk = 0; chunk < TabularDataViewer.numberOfRows; chunk += chunkSize) {
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
            15 // black
          )
        }
      }

      for (let rowOffset = 0; rowOffset <= Screen.HEIGHT; rowOffset += rowBufferSize) {
        Screen.drawLine(
          Screen.LEFT_EDGE,
          Screen.TOP_EDGE + rowOffset,
          Screen.WIDTH,
          Screen.TOP_EDGE + rowOffset,
          15 // black
        )
      }

      // Draw selected box:
      Screen.drawRect(
        Screen.LEFT_EDGE,
        Screen.TOP_EDGE + (TabularDataViewer.currentRow * rowBufferSize),
        colBufferSizes[0],
        rowBufferSize,
        6 // blue
      )
    }

    draw() {
      Screen.fillRect(
        Screen.LEFT_EDGE,
        Screen.TOP_EDGE,
        Screen.WIDTH,
        Screen.HEIGHT,
        0xC // Purple
      )

      if (TabularDataViewer.updateDataRowsOnNextFrame)
        TabularDataViewer.updateDataRows()

      // Could be optimised by calculating the Col line boundaries once & re-using them, instead of each frame:
      const tabularRowBufferSize = Screen.HEIGHT / Math.min(TabularDataViewer.dataRows.length, TABULAR_MAX_ROWS);
      this.drawGridOfVariableColSize(this.headerStringLengths.slice(TabularDataViewer.currentCol), tabularRowBufferSize)

      // Write the data into the grid:
      for (let row = 0; row < Math.min(TabularDataViewer.dataRows.length, TABULAR_MAX_ROWS); row++) {
        let cumulativeColOffset = 0;

        // Go through each column:
        for (let col = 0; col < TabularDataViewer.dataRows[0].length - TabularDataViewer.currentCol; col++) {
          const colID: number = col + TabularDataViewer.currentCol;

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
