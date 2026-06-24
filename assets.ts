namespace microdata {
  let extraImage: Bitmap | undefined;

  //% shim=TD_NOOP
  function extraSamples(name: string) {

  }


  export class AppAssets implements ui.UiAssetResolver {
    private icons: ui.UiMapAssets

    constructor() {
      this.icons = new ui.UiMapAssets({
        microdataLogo: microdataLogo,
        microbitLogo: ui.microbitLogo,
      }, bmp`.`)
    }

    public getBitmap(
      id: string | number,
      nullIfMissing?: boolean,
    ): Bitmap | undefined {
      if (id == "start") {
        return bmp`
                  . 7 .
                  7 7 7
                  . 7 .
              `
      }
      return this.icons.getBitmap(id, nullIfMissing)
    }

    public getText(id: string): string {
      if (id == "startLabel") return "Start"
      return ""
    }
  }

  /**
  * NOTE: Need to add the correct Jacdac logo
  */
  export function sensorNameToBitmap(name: string): Bitmap | undefined {
    switch (name) {
      case "Accelerometer X": {
        return ui.accelerometer;
      }
      case "Accelerometer Y": {
        return ui.accelerometer;
      }
      case "Accelerometer Z": {
        return ui.accelerometer;
      }
      case "Pitch": {
        return ui.car_right_turn;
      }
      case "Roll": {
        return ui.car_right_spin;
      }
      case "Analog Pin 0": {
        return ui.pin_0;
      }
      case "Analog Pin 1": {
        return ui.pin_1;
      }
      case "Analog Pin 2": {
        return ui.pin_2;
      }
      case "Light": {
        return ui.led_light_sensor;
      }
      case "Temperature": {
        return ui.thermometer;
      }
      case "Magnetometer": {
        return ui.magnet;
      }
      case "Logo": {
        return ui.finger_press;
      }
      case "Volume": {
        return ui.microphone;
      }
      case "Compass": {
        return ui.compass;
      }

      //NOTE: Need to add Jacdac logo:
      case "Jacdac": {
        return ui.microbitLogoWhiteBackground;
      }

      default: {
        return undefined;
      }
    }
  }

  export const microdataLogo = bmp` 
    ....111111.......111111...1111................................................11111111111..............................................................
    ...11bbbbbb.....11bbbbbb.11bbbb...............................................1bbbbbbbbbbff.......................111..................................
    ...1bbbbbbbb...11bbbbbbbf1bbbbbf..............................................1bbbbbbbbbbbff.....................1bbbb.................................
    ...1bbbbbbbbb.11bbbbbbbbf1bbbbbf..............................................1bbbbbbbbbbbbff...................1bbbbbf................................
    ...1bbbbbbbbbb1bbbbbbbbbf1bbbbbf..............................................1bbbbfffbbbbbbf...................1bbbbbf................................
    ...1bbbbbbbbbbbbbbbbbbbbf.bbbbff..............................................1bbbf....bbbbbff..................1bbbbbf................................
    ...1bbbbbbbbbbbbbbbbbbbbf..ffff.....1111111......1111...111.......1111111.....1bbbf.....1bbbbf...11111111.......1bbbbbb11111111....111111111...........
    ...1bbbbbbbbbbbbbbbbbbbbf.1111....111bbbbbbb1...11bbbb.11bbb....111bbbbbbb1...1bbbf.....1bbbbf..1bbbbbbbbbf.....1bbbbbbbbbbbbbbf..1bbbbbbbbbbf.........
    ...1bbbbbbbbbbbbbbbbbbbbf11bbbb..11bbbbbbbbbbb..1bbbbbb1bbbbb..11bbbbbbbbbbb..1bbbf.....1bbbbf.1bbbbbbbbbbbf....1bbbbbbbbbbbbbbf.1bbbbbbbbbbbbf........
    ...1bbbbbbfbbbbbfbbbbbbbf1bbbbbf.1bbbbbbbbbbbbf.1bbbbbbbbbbbbf.1bbbbbbbbbbbbf.1bbbf.....1bbbbf1bbbbbbbbbbbbbf...1bbbbbbbbbbbbbf.1bbbbbbbbbbbbbbf.......
    ...1bbbbbbf.bbbff1bbbbbbf1bbbbbf11bbbbbbbbbbbbb.1bbbbbbbbbbbbf11bbbbbbbbbbbbb.1bbbf.....1bbbbf1bbbbbbbbbbbbbf...1bbbbbbfffffff..1bbbbbbbbbbbbbbf.......
    ...1bbbbbbf..fff.1bbbbbbf1bbbbbf1bbbbbfffbbbbbbf1bbbbbfffbbbff1bbbbbfffbbbbbbfbbbbf.....1bbbbf1bbbbbfffbbbbbf...1bbbbbbf........1bbbbbfffbbbbbbf.......
    ...1bbbbbbf......1bbbbbbf1bbbbbf1bbbbff...bbbbff1bbbbbf...fff.1bbbbff...bbbbbfbbbbf.....1bbbbf1bbbbf...bbbbbf...1bbbbbbf........1bbbbf...bbbbbbf.......
    ...1bbbbbbf......1bbbbbbf1bbbbbf1bbbbf.....ffff.1bbbbbf.......1bbbbf....1bbbbfbbbbf.....1bbbbf1bbbbf...1bbbbf...1bbbbbbf........1bbbbf...1bbbbbf.......
    ...1bbbbbbf......1bbbbbbf1bbbbbf1bbbbf....1111..1bbbbbf.......1bbbbf....1bbbbfbbbbf.....1bbbbf1bbbbf...1bbbbf...1bbbbbbf........1bbbbf...1bbbbbf.......
    ...1bbbbbbf......1bbbbbbf1bbbbbf1bbbbb...11bbbb.1bbbbbf.......1bbbbb...11bbbbfbbbbf....1bbbbbf1bbbbb1..1bbbbf...1bbbbbbf........1bbbbb1..1bbbbbf.......
    ...1bbbbbbf......1bbbbbbf1bbbbbf1bbbbbb111bbbbbf1bbbbbf.......1bbbbbb111bbbbbfbbbbb...1bbbbbbf1bbbbbb11bbbbbf...1bbbbbbf........1bbbbbb11bbbbbbf.......
    ...1bbbbbbf......1bbbbbbf1bbbbbf.bbbbbbbbbbbbbff1bbbbbf........bbbbbbbbbbbbbffbbbbbb11bbbbbbf.bbbbbbbbbbbbbbb1..bbbbbbb11111111.bbbbbbbbbbbbbbbb1......
    ...1bbbbbbf......1bbbbbbf1bbbbbf.1bbbbbbbbbbbbf.1bbbbbf........1bbbbbbbbbbbbf.bbbbbbbbbbbbbbf.fbbbbbbbbbbbbbbb1.fbbbbbbbbbbbbbb.fbbbbbbbbbbbbbbbb1.....
    ...1bbbbbbf......1bbbbbbf1bbbbbf..bbbbbbbbbbbff.1bbbbbf.........bbbbbbbbbbbff.bbbbbbbbbbbbbff..fbbbbbbbbbbbbbbb..fbbbbbbbbbbbbf..fbbbbbbbbbbbbbbbb.....
    ....bbbbbff.......bbbbbff.bbbbff...fbbbbbbbfff...bbbbff..........fbbbbbbbfff...fbbbbbbbbbff.....fbbbbbbbbbbbbff...fbbbbbbbbbbf....fbbbbbbbbbbbbbff.....
    .....fffff.........fffff...ffff......fffffff......ffff.............fffffff......fffffffff........fffffffffffff.....ffffffffff......ffffffffffffff......
`
}
