namespace microdata {
  const SENSOR_SELECT_PICKER_SCOPE = "select-sensor"
  const SENSOR_SELECT_PICKER_COLUMNS = 5
  const SENSOR_SELECT_PICKER_ITEM = 28
  const SENSOR_SELECT_PICKER_GAP = 4

  // Selected sensors get a thick yellow rounded border.
  const SENSOR_SELECTED_STYLE: ui.UiButtonStyle = {
    backgroundColor: 1,
    frame: "roundedRect",
    borderColor: 5,
    borderThickness: 3,
  }

  interface SensorChoice {
    sensor: sensors.Sensor
  }

  export interface SensorPickerOptions {
    screen: ui.UiScreen
    // Re-read after pruning, so it must reflect live caller state.
    selected: () => sensors.Sensor[]
    pickedSensors?: sensors.Sensor[]
    maxSelectableSensorNum?: number
    onPick: (sensor: sensors.Sensor) => void
    // One call per selected sensor that has left the bus, highest index first
    onUnpick?: (index: number) => void
  }

  export function getAvailableMicrobitAndJacdacSensors(): sensors.Sensor[] {
    return sensors.getAllMicrobitSensors().concat(sensors.getAllConnectedJacdacSimpleSensors())
  }

  // Prunes disconnected selections
  // uses sensorNameToBitmap from assets
  export function openSensorPicker(getAvailableSensorsFn: () => sensors.Sensor[], options: SensorPickerOptions): void {
    const availableSensors = getAvailableSensorsFn()

    // Check if a sensor was unselected:
    const stale = options.selected()
    for (let i = stale.length - 1; i >= 0; i--)
      if (!availableSensors.some(s => s.name === stale[i].name) && options.onUnpick)
        options.onUnpick(i)

    const selectedSensors: sensors.Sensor[] = options.selected()
    const pickedSensors: sensors.Sensor[] = options.pickedSensors || []
    const full = (options.maxSelectableSensorNum !== undefined) && (selectedSensors.length >= options.maxSelectableSensorNum)

    const controls: ui.UiControl<SensorChoice>[] =
      availableSensors.map((sensor: sensors.Sensor, i: number) => {
        const isSelected = selectedSensors.some(s => s.name === sensor.name)
        const pickable = !pickedSensors.some(s => s.name === sensor.name) && (isSelected || !full)

        return {
          id: `sensor-${i}`,
          value: { sensor },
          focusLabel: pickable ? sensor.name : `${sensor.name} (in use)`,
          bitmap: sensorNameToBitmap(sensor.name, sensor.isJacdacSensor),
          style: isSelected ? SENSOR_SELECTED_STYLE : undefined,
          focusable: pickable,
        }
      })

    options.screen.openModal(new ui.UiPicker<SensorChoice>({
      modalScopeId: SENSOR_SELECT_PICKER_SCOPE,
      title: "Sensors",
      controls,
      columnCount: SENSOR_SELECT_PICKER_COLUMNS,
      controlSize: { width: SENSOR_SELECT_PICKER_ITEM, height: SENSOR_SELECT_PICKER_ITEM },
      columnGap: SENSOR_SELECT_PICKER_GAP,
      rowGap: SENSOR_SELECT_PICKER_GAP,
      controlStyle: ui.UiButtonStyles.LightShadowedWhite,
      closeOnActivate: true,
      onActivate: (choice: SensorChoice) => options.onPick(choice.sensor),
    }))
  }
}
