namespace microdata {
  export class Home extends ui.UiScreen {
    private toggleBtn: ui.UiButton;
    private status: "Ready" | "Started" | "Stopped";

    constructor(runtime: ui.UiRuntime) {
      super(runtime);

      const y = 25

      // this.btn =  new Button({
      //   parent: null,
      //   style: ButtonStyles.Transparent,
      //   icon: "linear_graph_1",
      //   ariaId: "Real-time Data",
      //   x: -58,
      //   y,
      //   onClick: () => {
      //     this.app.popScene()
      //     this.app.pushScene(new SensorSelect(this.app, MicroDataSceneEnum.LiveDataViewer))
      //   },
      // }),

      this.toggleBtn = new ui.UiButton("toggle", "Real-time data", () => {
        this.status = this.status == "Started" ? "Stopped" : "Started"
        this.toggleBtn.setText(
          this.status == "Started" ? "Stop" : "Start",
        );
      })

      // new Button({
      //   parent: null,
      //   style: ButtonStyles.Transparent,
      //   icon: "edit_program",
      //   ariaId: "Log Data",
      //   x: -20,
      //   y,
      //   onClick: () => {
      //     this.app.popScene()
      //     this.app.pushScene(new SensorSelect(this.app, MicroDataSceneEnum.RecordingConfigSelect))
      //   },
      // }),

      // new Button({
      //   parent: null,
      //   style: ButtonStyles.Transparent,
      //   icon: "radio_set_group",
      //   ariaId: "Command Mode",
      //   x: 20,
      //   y,
      //   onClick: () => {
      //     this.app.popScene()
      //     this.app.pushScene(new DistributedLoggingScreen(this.app))
      //   },
      // }),

      // new Button({
      //   parent: null,
      //   style: ButtonStyles.Transparent,
      //   icon: "largeDisk",
      //   ariaId: "View Data & Settings",
      //   x: 58,
      //   y,
      //   onClick: () => {
      //     this.app.popScene()
      //     this.app.pushScene(new DataViewSelect(this.app))
      //   },
      // })
    }

    // private drawVersion() {
    //   const font = bitmaps.font5
    //   const text = "v1.7.5"
    //   Screen.print(
    //     text,
    //     Screen.RIGHT_EDGE - (font.charWidth * text.length),
    //     Screen.BOTTOM_EDGE - font.charHeight - 2,
    //     0xb,
    //     font
    //   )
    // }

    // private yOffset = -Screen.HEIGHT >> 1
    render(surface: ui.DrawSurface): void {
      surface.fillRect(new ui.Rect(0, 0, 160, 120), 0x12);
      surface.drawBitmap(this.assets.getBitmap("microdataLogo"), 0, 0);

      // const microdataLogo = Icons.get("microdataLogo")

      // this.btn.render

      // this.yOffset = Math.min(0, this.yOffset + 2)
      // const t = control.millis()
      // const dy = this.yOffset == 0 ? (Math.idiv(t, 800) & 1) - 1 : 0
      // const margin = 2
      // const OFFSET = (Screen.HEIGHT >> 1) - microdataLogo.height - margin - 9
      // const y = Screen.TOP_EDGE + OFFSET //+ dy
      // Screen.drawTransparentImage(
      //   microdataLogo,
      //   Screen.LEFT_EDGE + ((Screen.WIDTH - microdataLogo.width) >> 1)// + dy
      //   ,
      //   y + this.yOffset
      // )
      //
      // Screen.drawTransparentImage(
      //   microbitLogo,
      //   Screen.LEFT_EDGE +
      //   ((Screen.WIDTH - microbitLogo.width) >> 1) + dy
      //   ,
      //   y - microdataLogo.height + this.yOffset + margin
      // )
      //
      // if (!this.yOffset) {
      //   Screen.print(
      //     "Mini-measurer",
      //     Screen.LEFT_EDGE +
      //     ((Screen.WIDTH + microdataLogo.width) >> 1)
      //     + dy
      //     -
      //     font.charWidth * "Mini-measurer".length,
      //     Screen.TOP_EDGE +
      //     OFFSET +
      //     microdataLogo.height +
      //     dy +
      //     this.yOffset +
      //     3,
      //     0xb,
      //     font
      //   )
      // }
      //
      // this.navigator.drawComponents();
      // this.drawVersion()
      // super.draw()
    }
  }
}
