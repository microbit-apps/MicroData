namespace microdata {
  /**
   * Sensor Selection cycles between 'animations' of the options; animations are an LED loop specific to that sensor.
   * Mutated by the A & B button
   */
  const enum UI_MODE {
    SENSOR_SELECTION,
    LOGGING
  };


  /**
   * Represents the internal state of the UI diplay when in SENSOR_SELECTION UI_MODE;
   * 
   * Mutated by the A & B button & .dynamicSensorSelectionLoop()
   * 
   * Which LED should be shown and what Sensor object should it be converted to when complete.
   * see .uiSelectionToSensor()
   * 
   * Notice the RADIO element; which is not a sensor; see .uiSelectionToSensor() since it is handled differently.
   */
  const enum UI_SENSOR_SELECT_STATE {
    ACCELERATION,
    TEMPERATURE,
    LIGHT,
    MAGNET
  };

  /** For module inside of B button. */
  const UI_SENSOR_SELECT_STATE_LEN = 4;
  /** How long should each LED picture be shown for? Series of pictures divide this by how many there are. */
  const SHOW_EACH_SENSOR_FOR_MS: number = 1000;

  /**
   * Simple class to enable the use of MicroData w/o an Arcade Shield for recording data for the sensors listed in UI_SENSOR_SELECT_STATE.
   * Invoked if an arcade shield is not detected from app.ts
   * The LED is used to represent sensor options, the user can press A to select one; which starts logging.
   * Or press B to move onto the next one.
   * 
   * Logging happens every second and is indefinite. The user may cancel the logging via the B button.
   * 
   * Whilst the sensors are cycled between the sensor being displayed may dynamically update if the readings from that sensor are in excess.
   *      See .dynamicSensorSelectionLoop()
   *      It checks all sensors inside UI_SENSOR_SELECT_STATE; if there is one that has a reading beyond the threshold then it will switch this.uiSensorSelectState to that sensor.
   *      This allows the user to cycle between UI elements phsyically - by shining light on or shaking the microbit.
   * 
   * Fibers and special waiting functions .waitUntilSensorSelectStateChange & .waitUntilUIModeChanges are required to maintain low-latency and the dynamic behaviour described above.
   */
  export class HeadlessMode {
    /** Mutated by the A & B button */
    private uiMode: UI_MODE;
    /** Mutated by the B button & .dynamicSensorSelectionLoop() */
    private uiSensorSelectState: UI_SENSOR_SELECT_STATE;

    constructor() {
      this.uiMode = UI_MODE.SENSOR_SELECTION;
      this.uiSensorSelectState = UI_SENSOR_SELECT_STATE.ACCELERATION;

      // A Button
      input.onButtonPressed(1, () => {
        if (this.uiMode == UI_MODE.SENSOR_SELECTION) {
          this.uiMode = UI_MODE.LOGGING;
        } else if (this.uiMode == UI_MODE.LOGGING) {
          this.uiMode = UI_MODE.SENSOR_SELECTION;
        }
      })

      // B Button
      input.onButtonPressed(2, () => {
        if (this.uiMode == UI_MODE.SENSOR_SELECTION)
          this.uiSensorSelectState = (this.uiSensorSelectState + 1) % UI_SENSOR_SELECT_STATE_LEN
        else if (this.uiMode == UI_MODE.LOGGING) {
          this.uiMode = UI_MODE.SENSOR_SELECTION;
        }
      })

      this.loop();
    }

    private loop() {
      while (1) {
        if (this.uiMode == UI_MODE.SENSOR_SELECTION) {
          switch (this.uiSensorSelectState) {
            case UI_SENSOR_SELECT_STATE.ACCELERATION: {
              // basic.showLeds() requires a '' literal; thus the following is un-loopable: 

              basic.showLeds(`
                  # # # . .
                  # # . . .
                  # . # . .
                  . . . # .
                  . . . . .
              `);
              if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS / 3), 10, UI_SENSOR_SELECT_STATE.ACCELERATION)) break;

              basic.showLeds(`
                  . . # . .
                  . . # . .
                  # # # # #
                  . # # # .
                  . . # . .
              `);
              if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS / 3), 10, UI_SENSOR_SELECT_STATE.ACCELERATION)) break;

              basic.showLeds(`
                  . . # . .
                  . . # # .
                  # # # # #
                  . . # # .
                  . . # . .
              `);
              if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS / 3), 10, UI_SENSOR_SELECT_STATE.ACCELERATION)) break;

              break;
            }

            case UI_SENSOR_SELECT_STATE.TEMPERATURE: {
              basic.showLeds(`
                  # . . . .
                  . . # # .
                  . # . . .
                  . # . . .
                  . . # # .
              `);
              if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS), 50, UI_SENSOR_SELECT_STATE.TEMPERATURE)) break;

              break;
            }

            case UI_SENSOR_SELECT_STATE.LIGHT: {
              basic.showLeds(`
                . . . . .
                . # # # .
                . . # . .
                . . . . .
                . . # . .
              `);
              if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS >> 1), 50, UI_SENSOR_SELECT_STATE.LIGHT)) break;

              basic.showLeds(`
                  . # # # .
                  . # # # .
                  . # # # .
                  . . . . .
                  . . # . .
              `);
              if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS >> 1), 50, UI_SENSOR_SELECT_STATE.LIGHT)) break;

              break;
            }

            case UI_SENSOR_SELECT_STATE.MAGNET: {
              basic.showLeds(`
                                . # # # .
                                # # # # #
                                # # . # #
                                . . . . .
                                . . . . .
                            `)
              if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS >> 1), 50, UI_SENSOR_SELECT_STATE.MAGNET)) break;

              basic.showLeds(`
                                . # # # .
                                # # # # #
                                # # . # #
                                . . . . .
                                # # . # #
                            `)
              if (!this.waitUntilSensorSelectStateChange((SHOW_EACH_SENSOR_FOR_MS >> 1), 50, UI_SENSOR_SELECT_STATE.MAGNET)) break;

              break;
            }

            default:
              break;
          }
        } else if (this.uiMode == UI_MODE.LOGGING) {
          const sensors = this.uiSelectionToSensors();
          let time = 0;

          basic.showLeds(`
            . . . . .
            . . . . .
            . . . . .
            . . . . .
            . # # # .
          `)

          // control.inBackground(() => {
          const WAIT_TIME_MS = 50;
          let start = input.runningTime();
          while (this.uiMode == UI_MODE.LOGGING) {
            sensors.forEach((sensor, index) => {
              datalogger.log(
                datalogger.createCV("Sensor", sensor.getName()),
                datalogger.createCV("Time (ms)", time),
                datalogger.createCV("Reading", sensor.getReading()),
                datalogger.createCV("Event", "N/A")
              );
            });
            time += WAIT_TIME_MS;

            const loop = input.runningTime();
            basic.pause(WAIT_TIME_MS - (loop - start));
            start = loop;
          }

          basic.showLeds(`
            . . . . .
            . # . # .
            . . . . .
            # . . . #
            . # # # .
          `)
          basic.pause(1000)
        }
      }
    }

    //-------------------------
    // Special Waiting Methods:
    //-------------------------

    /**
     * Wait time number of milliseconds but in increments of check_n_times. Exit if initialState changes.
     * To show led animations you need to wait inbetween each frame. But you need to switch to another state if a button is pressed immediately.
     * used by .showSensorIcon()
     * 
     * @param time milliseconds
     * @param check_n_times period = time / check_n_times
     * @param initialState this.uiSensorSelectState != causes pre-mature exit; returning false.
     * @returns true if neither this.uiSensorSelectState nor this.uiMode changed; meaning that the full time was waited.
     */
    private waitUntilSensorSelectStateChange(time: number, check_n_times: number, initialState: UI_SENSOR_SELECT_STATE): boolean {
      const period = time / check_n_times;

      for (let n = 0; n < check_n_times; n++) {
        if (this.uiSensorSelectState != initialState || this.uiMode != UI_MODE.SENSOR_SELECTION)
          return false;

        basic.pause(period)
      }
      return true;
    }


    /**
     * this.uiSensorSelectState -> relevant sensors
     * Most are only 1 sensor, but UI_SENSOR_SELECT_STATE.ACCELERATION gives all X,Y,Z sensors.
     * 
     * Special note to UI_SENSOR_SELECT_STATE.RADIO which leaves NoArcadeShieldMode & starts the DistributedLoggingProtocol().
     * 
     * @returns sensors used by .log()
     */
    private uiSelectionToSensors(): Sensor[] {
      switch (this.uiSensorSelectState) {
        case UI_SENSOR_SELECT_STATE.ACCELERATION:
          return [Sensor.getFromName("Accel. X"), Sensor.getFromName("Accel. Y"), Sensor.getFromName("Accel. Z")]

        case UI_SENSOR_SELECT_STATE.TEMPERATURE:
          return [Sensor.getFromName("Temp.")]

        case UI_SENSOR_SELECT_STATE.LIGHT:
          return [Sensor.getFromName("Light")]

        case UI_SENSOR_SELECT_STATE.MAGNET:
          return [Sensor.getFromName("Magnet")]

        default:
          return []
      }
    }
  }
}
