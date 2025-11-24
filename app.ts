namespace microdata {
  import AppInterface = user_interface_base.AppInterface
  import Scene = user_interface_base.Scene
  import SceneManager = user_interface_base.SceneManager


  /**
  * Used to control the flow between scenes,
  * The SensorSelect scene is used to set the sensors before the RecordData, DistributedLogging and LiveDataViewer scenes
  * This enum may be passed to the constructors of these scenes so that they can dynamically control this flow.
  *
  */
  export enum MicroDataSceneEnum {
    LiveDataViewer,
    SensorSelect,
    RecordingConfigSelect,
    RecordData,
    DistributedLogging
  }

  // Auto-save slot
  export const SAVESLOT_AUTO = "sa"

  export interface SavedState {
    progdef: any
    version?: string
  }

  // application configuration
  // user_interface_base.getIcon = (id) => Icons..get(id)
  user_interface_base.getIcon = (id) => microdata.Icons.get(id)
  user_interface_base.resolveTooltip = (ariaId: string) => ariaId

  /**
   * If an Arcade Shield is not present when starting MicroData that Microbit will enter DistributedLoggingProtocol.
   *      It will show a :) on its LEDs and try to become a Target - where it will receive radio commands from a Commander Microbit (one with an Arcade Shield)
   */
  export class App implements AppInterface {
    sceneManager: SceneManager

    constructor() {
      // One interval delay to ensure all static constructors have executed.
      basic.pause(10)
      reportEvent("app.start")

      this.sceneManager = new SceneManager()
      datalogger.includeTimestamp(FlashLogTimeStampFormat.None)

      // datalogger.deleteLog(datalogger.DeleteType.Fast)
      // for (let i = 0; i < 400; i++) {
      //     datalogger.log(
      //       datalogger.createCV("Sensor", "testtest"),
      //       datalogger.createCV("Time (ms)", i * 1000),
      //       datalogger.createCV("Reading", (i * 43) % 5000),
      //       datalogger.createCV("Event", "N/A")
      //     )
      //     basic.pause(1)
      // }
      // this.pushScene(new microdata.TabularDataViewer(this, () => {}));

      const arcadeShieldConnected = shieldhelpers.shieldPresent();
      if (arcadeShieldConnected)
        this.pushScene(new microdata.Home(this));
      else
        new HeadlessMode();
    }

    public pushScene(scene: Scene) {
      this.sceneManager.pushScene(scene)
    }

    public popScene() {
      this.sceneManager.popScene()
    }

    public save(slot: string, buffer: Buffer): boolean {
      return true;
    }

    public load(slot: string): Buffer {
      return Buffer.create(0)
    }
  }
}
