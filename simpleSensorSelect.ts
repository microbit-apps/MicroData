namespace microdata {
    export class SimpleSensorSelect extends ui.UiScreen {
        private selectedSensors: sensors.Sensor[];

        constructor(runtime: ui.UiRuntime) {
            super(runtime)
            this.backgroundColor = 6
            this.selectedSensors = []

            this.add(
                new ui.UiButton(
                    "sensors", 
                    "Sensors", 
                    () => {
                        openSensorPicker(
                            getAvailableMicrobitAndJacdacSensors, {
                            screen: this,
                            selected: () => this.selectedSensors,
                            // Example of how to do more complex behaviours, in this case preventing deselction only of the last picked:
                            // pickedSensors: this.selectedSensors.length == 0 ? [] : this.selectedSensors.slice(-1),
                            onPick: sensor => this.selectSensor(sensor),
                            onUnpick: index => {
                                this.selectedSensors.splice(index, 1)
                            },
                        })
                    }
                ),
                {centerX: 80, centerY: 60}
            )
        }

        private selectSensor(sensor: sensors.Sensor): void {
            const selectedSensorIdx = this.selectedSensors.map(s => s.name).indexOf(sensor.name)
            if (selectedSensorIdx === -1)
                this.selectedSensors.push(sensor)
            else
                this.selectedSensors.splice(selectedSensorIdx, 1)
        }

        handleInput(event: ui.UiInputEvent) {
            if (event.action == "cancel" && event.phase == "pressed") {
                this.runtime.pop()
                return true;
            }
            return undefined;
        }

        render(surface: ui.DrawSurface) {
            super.render(surface)
        }
    }
}
