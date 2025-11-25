namespace microdata {
  import AppInterface = user_interface_base.AppInterface
  import Scene = user_interface_base.Scene

  export class JacdacLightExperiment extends Scene {
    constructor(app: AppInterface) {
      super(app);
    }

    private setupJacdacSensors() {
      modules.led1.start();
      modules.color1.start();
      modules.ledStrip1.start();
      modules.ledStrip1.setBrightness(75)

      // A:
      input.onButtonPressed(1, () => {
        const red = 0xFF0000
        for (let i = 0; i < modules.led1.numPixels(); i++) {
          modules.led1.setPixelColor(i, red)
        }
        modules.ledStrip1.setAll(red)
        modules.color1.red()
      })

      // B:
      input.onButtonPressed(2, () => {
        const blue = 0x0000FF
        for (let i = 0; i < modules.led1.numPixels(); i++) {
          modules.led1.setPixelColor(i, blue)
        }
        modules.ledStrip1.setAll(blue)
        modules.color1.blue()
      })
    }

    /* overide*/ startup() {
      this.setupJacdacSensors();
      this.app.pushScene(new LiveDataViewer(this.app, [Sensor.getFromName("Light")]))
    }
  }
}
