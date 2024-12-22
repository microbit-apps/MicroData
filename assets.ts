namespace microdata {
    import Screen = user_interface_base.Screen

    let extraImage: Bitmap = null

    //% shim=TD_NOOP
    function extraSamples(name: string) {

    }


    // export function sendAllAssetsOverRadio() {
    //     const iconNames: string[] = [
    //         "wordLogo",
    //         "microbitLogo",
    //         "edit_program",
    //         "MISSING",
    //         "largeDisk",
    //         "linear_graph_1",
    //         "led_light_sensor",
    //         "thermometer",
    //         "accelerometer",
    //         "finger_press",
    //         "green_tick",
    //         "magnet",
    //         "pin_0",
    //         "pin_1",
    //         "pin_2",
    //         "right_turn",
    //         "right_spin",
    //         "microphone",
    //         "tile_button_a",
    //         "tile_button_b",
    //         "compass",
    //         "radio_set_group",
    //         "largeSettingsGear",
    //         "microbitLogoWhiteBackground"
    //     ];

    //     basic.showString("Startin")
    //     radio.sendString("ASSET_TX_START" + ", " + iconNames.length)
    //     iconNames.forEach(name => {
    //         Screen.sendBitmap(name, icons.get(name))
    //     })

    //     radio.sendString("ASSET_TX_END")
    //     basic.showString("Done")
    // }

    // All unused assets have been cut since the flash storage limit has been approached

    export class icons {
        public static get(name: string, nullIfMissing = false): Bitmap {
            // editor icons
            if (name == "wordLogo") return icondb.wordLogo
            if (name == "microbitLogo") return icondb.microbitLogo
            if (name == "edit_program") return icondb.largeEditIcon
            if (name == "MISSING") return icondb.MISSING
            if (name == "largeDisk") return icondb.largeDisk

            if (name == "linear_graph_1") return icondb.linearGraph1

            if (name == "led_light_sensor") return icondb.led_light_sensor
            if (name == "thermometer") return icondb.thermometer
            if (name == "accelerometer") return icondb.accelerometer
            if (name == "finger_press") return icondb.finger_press
            if (name == "green_tick") return icondb.green_tick

            if (name == "magnet") return icondb.magnet
            if (name == "pin_0") return icondb.pin_0
            if (name == "pin_1") return icondb.pin_1
            if (name == "pin_2") return icondb.pin_2

            if (name == "right_turn") return icondb.car_right_turn
            if (name == "right_spin") return icondb.car_right_spin

            if (name == "microphone") return icondb.microphone

            if (name == "tile_button_a") return icondb.tile_button_a
            if (name == "tile_button_b") return icondb.tile_button_b
            if (name == "compass") return icondb.compass

            if (name == "radio_set_group") return icondb.radio_set_group
            if (name == "largeSettingsGear") return icondb.largeSettingsGear
            if (name == "microbitLogoWhiteBackground") return icondb.microbitLogoWhiteBackground

            extraImage = null
            extraSamples(name) // only for web app
            if (extraImage) return extraImage
            if (nullIfMissing) return null
            return icondb.MISSING
        }
    }


    namespace icondb {
        export const wordLogo = bmp` 
        ....111111.......111111...1111................................................11111111111.........................1111.................................
        ...11bbbbbb.....11bbbbbb.11bbbb...............................................1bbbbbbbbbbff......................11bbbb................................
        ...1bbbbbbbb...11bbbbbbbf1bbbbbf..............................................1bbbbbbbbbbbff.....................1bbbbbf...............................
        ...1bbbbbbbbb.11bbbbbbbbf1bbbbbf..............................................1bbbbbbbbbbbbff....................1bbbbbf...............................
        ...1bbbbbbbbbb1bbbbbbbbbf1bbbbbf..............................................1bbbbf..bbbbbbf....................1bbbbbf...............................
        ...1bbbbbbbbbbbbbbbbbbbbf.bbbbff..............................................1bbbb....bbbbbff...................1bbbbbf...............................
        ...1bbbbbbbbbbbbbbbbbbbbf..ffff.....1111111......1111...111.......1111111.....1bbbb.....1bbbbf....11111111.......1bbbbbb11111111....11111111...........
        ...1bbbbbbbbbbbbbbbbbbbbf.1111....111bbbbbbb1...11bbbb.11bbb....111bbbbbbb1...1bbbb.....1bbbbf...1bbbbbbbbbf.....1bbbbbbbbbbbbbbf..1bbbbbbbbbf.........
        ...1bbbbbbbbbbbbbbbbbbbbf11bbbb..11bbbbbbbbbbb..1bbbbbb1bbbbb..11bbbbbbbbbbb..1bbbb.....1bbbbf..1bbbbbbbbbbbbf...1bbbbbbbbbbbbbbf.1bbbbbbbbbbbbf.......
        ...1bbbbbbfbbbbbfbbbbbbbf1bbbbbf.1bbbbbbbbbbbbf.1bbbbbbbbbbbbf.1bbbbbbbbbbbbf.1bbbb.....1bbbbf.1bbbbbbbbbbbbbf...1bbbbbbbbbbbbbf.1bbbbbbbbbbbbbf.......
        ...1bbbbbbf.bbbff1bbbbbbf1bbbbbf11bbbbbbbbbbbbb.1bbbbbbbbbbbbf11bbbbbbbbbbbbb.1bbbb.....1bbbbf.1bbbbbbbbbbbbbf...1bbbbbbf........1bbbbbbbbbbbbbbf......
        ...1bbbbbbf..fff.1bbbbbbf1bbbbbf1bbbbbfffbbbbbbf1bbbbbfffbbbff1bbbbbfffbbbbbbfbbbbb.....1bbbbf.1bbbbffffbbbbbf...1bbbbbbf........1bbbbffffbbbbbbf......
        ...1bbbbbbf......1bbbbbbf1bbbbbf1bbbbff...bbbbff1bbbbbf...fff.1bbbbff...bbbbbfbbbbb.....1bbbbf.1bbbff...1bbbbf...1bbbbbbf........1bbbbf...1bbbbbf......
        ...1bbbbbbf......1bbbbbbf1bbbbbf1bbbbf.....ffff.1bbbbbf.......1bbbbf....1bbbbfbbbbb.....1bbbbf.1bbbbf...1bbbbf...1bbbbbbf........1bbbbf...1bbbbbf......
        ...1bbbbbbf......1bbbbbbf1bbbbbf1bbbbf....1111..1bbbbbf.......1bbbbf....1bbbbfbbbbb.....1bbbbf.1bbbbf...1bbbbf...1bbbbbbf........1bbbbf...1bbbbbf......
        ...1bbbbbbf......1bbbbbbf1bbbbbf1bbbbb...11bbbb.1bbbbbf.......1bbbbb...11bbbbfbbbbb....bbbbbbf.1bbbbb...1bbbbf...1bbbbbbf........1bbbbb...1bbbbbf......
        ...1bbbbbbf......1bbbbbbf1bbbbbf1bbbbbb111bbbbbf1bbbbbf.......1bbbbbb111bbbbbfbbbbb...bbbbbbbf.1bbbbb111bbbbbf...1bbbbbbf........1bbbbbb111bbbbbf......
        ...1bbbbbbf......1bbbbbbf1bbbbbf.bbbbbbbbbbbbbff1bbbbbf........bbbbbbbbbbbbbffbbbbbbbbbbbbbbf..bbbbbbbbbbbbb1111.bbbbbbbb11111111bbbbbbbbbbbbbbb1111...
        ...1bbbbbbf......1bbbbbbf1bbbbbf.1bbbbbbbbbbbbf.1bbbbbf........1bbbbbbbbbbbbf.bbbbbbbbbbbbbbf..bbbbbbbbbbbbbbbbbfbbbbbbbbbbbbbbbfbbbbbbbbbbbbbbbbbbbf..
        ...1bbbbbbf......1bbbbbbf1bbbbbf..bbbbbbbbbbbff.1bbbbbf.........bbbbbbbbbbbff.bbbbbbbbbbbbbff..bbbbbbbbbbbbbbbbbfbbbbbbbbbbbbbbbfbbbbbbbbbbbbbbbbbbff..
        ....bbbbbff.......bbbbbff.bbbbff...fbbbbbbbfff...bbbbff..........fbbbbbbbfff..bbbbbbbbbbbff.....fbbbbbbbbbbbbbbbf.fbbbbbbbbbbbbbf.fbbbbbbbbbbbbbbbbff..
        .....fffff.........fffff...ffff......fffffff......ffff.............fffffff....fffffffffff.........ffffffffffffff....ffffffffffff....ffffffffffffffff...
    `

        export const microbitLogo = bmp`
        ............................
        ......5555555555555555......
        ....55555555555555555555....
        ...5554444444444444444555...
        ..5554.................555..
        ..554...................554.
        .554....55........55.....554
        .55....5555......5555....554
        .55....55554.....55554...554
        .55.....5544......5544...554
        ..55.....44........44...5544
        ..555..................5554.
        ...555................55544.
        ....5555555555555555555544..
        .....45555555555555555444...
        .......4444444444444444.....
    `



        //-------------
        // SMALL ICONS:
        //-------------


        export const microbitLogoWhiteBackground = bmp`
        11111111111111111
        11115555555551111
        11155555555555111
        11544444444444111
        15541111111114511
        15511111111111541
        55415511115511554
        55155551155551554
        55155554155554554
        55115544115544554
        15511441111441544
        15511111111111541
        11551111111114441
        11155555555555411
        11155555555555111
        11111444444441111
    `

        export const MISSING = bmp`
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . 2 2 2 2 2 2 2 2 2 2 . . .
        . . . 2 2 . . . . . . 2 2 . . .
        . . . 2 . 2 . . . . 2 . 2 . . .
        . . . 2 . . 2 . . 2 . . 2 . . .
        . . . 2 . . . 2 2 . . . 2 . . .
        . . . 2 . . . 2 2 . . . 2 . . .
        . . . 2 . . 2 . . 2 . . 2 . . .
        . . . 2 . 2 . . . . 2 . 2 . . .
        . . . 2 2 . . . . . . 2 2 . . .
        . . . 2 2 2 2 2 2 2 2 2 2 . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
    `

        export const green_tick = bmp`
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 6 6 1
        1 1 1 1 1 1 1 1 1 1 1 1 6 6 6 1
        1 1 1 1 1 1 1 1 1 1 1 6 6 6 6 1
        1 1 1 1 1 1 1 1 1 1 6 6 6 6 6 1
        1 1 1 1 1 1 1 1 1 6 6 6 6 6 1 1
        1 6 1 1 1 1 1 1 6 6 6 6 6 1 1 1
        1 6 6 1 1 1 1 6 6 6 6 6 1 1 1 1
        1 6 6 6 1 1 6 6 6 6 6 1 1 1 1 1
        1 6 6 6 6 6 6 6 6 6 1 1 1 1 1 1
        1 6 6 6 6 6 6 6 6 1 1 1 1 1 1 1
        1 6 6 6 6 6 6 6 1 1 1 1 1 1 1 1
        1 1 6 6 6 6 6 1 1 1 1 1 1 1 1 1
        1 1 1 6 6 6 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    `

        ///
        /// HARDWARE-SPECIFIC LANGUAGE TILES
        ///
        export const tile_button_a = bmp`
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . 8 . . .
        . . . . . . . . . . . 8 8 d . .
        . . . . . . . . . . 8 8 8 d . .
        . . . . . . . . . 8 8 8 8 d . .
        . . . . . . . . 8 8 8 8 8 d . .
        . . . . . . . 8 8 8 1 8 8 d . .
        . . . . . . 8 8 8 1 8 1 8 d . .
        . . . . . 8 8 8 8 1 1 1 8 d . .
        . . . . 8 8 8 8 8 1 8 1 8 d . .
        . . . 8 8 8 8 8 8 1 8 1 8 d . .
        . . 8 8 8 8 8 8 8 8 8 8 8 d . .
        . . . d d d d d d d d d d d . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
    `

        export const tile_button_b = bmp`
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . 8 8 8 8 8 8 8 8 8 8 8 . . .
        . . 8 1 1 8 8 8 8 8 8 8 d d . .
        . . 8 1 8 1 8 8 8 8 8 d d . . .
        . . 8 1 1 8 8 8 8 8 d d . . . .
        . . 8 1 8 1 8 8 8 d d . . . . .
        . . 8 1 1 8 8 8 d d . . . . . .
        . . 8 8 8 8 8 d d . . . . . . .
        . . 8 8 8 8 d d . . . . . . . .
        . . 8 8 8 d d . . . . . . . . .
        . . 8 8 d d . . . . . . . . . .
        . . 8 d d . . . . . . . . . . .
        . . . d . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
    `

        export const pin_0 = bmp`
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 4 4 4 4 4 1 1 1 4 4 1 1 1
        1 4 4 4 1 1 4 4 1 4 4 4 4 1 1
        1 4 4 4 1 1 1 4 4 4 1 1 4 4 1
        1 4 4 4 1 1 4 4 4 4 1 1 4 4 1
        1 4 4 4 4 4 4 1 4 4 1 1 4 4 1 
        1 4 4 4 1 1 1 1 4 4 1 1 4 4 1 
        1 4 4 4 1 1 1 1 4 4 1 1 4 4 1 
        1 4 4 4 1 1 1 1 4 4 1 1 4 4 1 
        1 4 4 4 1 1 1 1 4 4 1 1 4 4 1 
        1 4 4 4 1 1 1 1 4 4 1 1 4 4 1 
        1 4 4 4 1 1 1 1 1 4 4 4 4 1 1 
        1 1 4 1 1 1 1 1 1 1 4 4 1 1 1 
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    `

        export const pin_1 = bmp`
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 4 4 4 4 4 1 1 4 4 4 4 1 1
        1 4 4 4 1 1 4 4 4 4 4 4 4 1 1
        1 4 4 4 1 1 1 4 4 4 4 4 4 1 1
        1 4 4 4 1 1 4 4 1 1 4 4 4 1 1
        1 4 4 4 4 4 4 1 1 1 4 4 4 1 1
        1 4 4 4 1 1 1 1 1 1 4 4 4 1 1
        1 4 4 4 1 1 1 1 1 1 4 4 4 1 1
        1 4 4 4 1 1 1 1 1 1 4 4 4 1 1
        1 4 4 4 1 1 1 1 1 1 4 4 4 1 1
        1 4 4 4 1 1 1 1 1 1 4 4 4 1 1
        1 4 4 4 1 1 1 1 4 4 4 4 4 4 1
        1 1 4 1 1 1 1 4 4 4 4 4 4 4 4
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    `

        export const pin_2 = bmp`
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 4 4 4 4 4 1 1 4 4 4 4 1 1
        1 4 4 4 1 1 4 4 4 4 4 4 4 4 1
        1 4 4 4 1 1 1 4 4 4 1 1 4 4 4
        1 4 4 4 1 1 4 4 4 1 1 1 4 4 4
        1 4 4 4 4 4 4 1 1 1 1 1 4 4 4
        1 4 4 4 1 1 1 1 1 1 1 4 4 4 1
        1 4 4 4 1 1 1 1 1 1 1 4 4 4 1
        1 4 4 4 1 1 1 1 1 1 4 4 4 1 1
        1 4 4 4 1 1 1 1 1 4 4 4 4 1 1
        1 4 4 4 1 1 1 1 4 4 4 4 1 1 1
        1 4 4 4 1 1 1 4 4 4 4 4 4 4 4
        1 1 4 1 1 1 1 4 4 4 4 4 4 4 4
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    `

        export const compass = bmp`
        1 1 1 1 5 5 5 5 5 5 5 1 1 1 1
        1 1 1 5 5 5 5 5 5 5 5 5 1 1 1
        1 1 5 5 5 f f f f f 5 5 5 1 1
        1 5 5 5 f f f f f f 2 5 5 5 1
        5 5 5 f f f f f f 2 2 2 5 5 5
        5 5 f f f f f f 2 2 2 f f 5 5
        5 f f f f f f 2 2 2 f f f f 5
        5 f f f f f 1 1 1 2 f f f f 5
        5 f f f f 8 1 1 1 f f f f f 5
        5 f f f 8 8 1 1 1 f f f f f 5
        5 5 f 8 8 8 8 f f f f f f 5 5
        5 5 5 8 8 8 f f f f f f 5 5 5
        1 5 5 5 8 f f f f f f 5 5 5 1
        1 1 5 5 5 f f f f f 5 5 5 1 1
        1 1 1 5 5 5 5 5 5 5 5 5 1 1 1
        1 1 1 1 5 5 5 5 5 5 5 1 1 1 1
    `

        export const car_right_turn = bmp`
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 c c c 1 1 1 1 1
        1 1 1 1 1 1 1 1 c 7 7 c 1 1 1 1
        1 1 1 1 1 c c c c 7 7 7 c 1 1 1
        1 1 1 1 c 7 7 7 7 7 7 7 7 c 1 1
        1 1 1 c 7 7 7 7 7 7 7 7 7 7 c 1
        1 1 c 7 7 7 7 7 7 7 7 7 7 c 1 1
        1 c 7 7 7 7 7 c c 7 7 7 c 1 1 1
        1 c 7 7 7 7 c 1 c 7 7 c 1 1 1 1
        1 c 7 7 7 c d 1 c c c 1 1 1 1 1
        1 c 7 7 7 c d 1 1 1 1 1 1 1 1 1
        1 c 7 7 7 c d 1 1 1 1 1 1 1 1 1
        1 c 7 7 7 c d 1 1 1 1 1 1 1 1 1
        1 c 7 7 7 c d 1 1 1 1 1 1 1 1 1
        1 c c c c c 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    `

        export const car_right_spin = bmp`
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 c c c c c 1 1 1 1 1 1
        1 1 1 1 c 7 7 7 7 7 c 1 1 1 1 1
        1 1 1 c 7 7 7 7 7 7 7 c 1 1 1 1 
        1 1 c 7 7 7 7 7 7 7 7 7 c 1 1 1
        1 c 7 7 7 7 7 c c 7 7 7 c 1 1 1
        c 7 7 7 7 7 c c c 7 7 7 c c c 1
        c 7 7 7 7 c c 7 7 7 7 7 7 7 c d
        c 7 7 7 c d c 7 7 7 7 7 7 7 c d
        c 7 7 7 c d 1 c 7 7 7 7 7 c d 1
        c 7 7 7 c d 1 1 c 7 7 7 c d 1 1
        c 7 7 7 c d 1 1 1 c 7 c d 1 1 1
        c 7 7 7 c 1 1 1 1 1 c d 1 1 1 1
        c c c c c 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1    
    `

        export const finger_press = bmp`
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 f 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 f 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 f 1 1 1 1 1 1 1 1
        1 1 1 1 1 f 1 f 1 f 1 1 1 1 1 1
        1 1 1 1 1 1 f f f 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 f 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 4 4 4 4 4 1 1 1 1 1 1
        1 1 1 1 4 4 4 4 4 4 4 d 1 1 1 1
        1 1 1 e 4 4 4 4 4 4 4 e d 1 1 1
        1 1 1 e 2 4 4 4 4 4 2 e d 1 1 1
        1 1 1 e e 2 2 2 2 2 e e d 1 1 1
        1 1 1 1 e e e e e e e d 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    `

        export const magnet = bmp`
        1 1 1 1 1 1 1 1 1 1 1 1 6 1 1 1 
        1 1 1 1 1 1 1 1 1 1 6 1 1 1 6 1 
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 
        1 1 1 8 8 8 8 8 f f 1 1 6 1 1 1 
        1 1 8 8 8 8 8 8 f f 1 1 1 1 1 6 
        1 8 8 8 b b b b b b 1 1 6 1 1 1 
        1 8 8 b 1 1 1 1 1 1 1 1 1 1 6 1 
        1 8 8 1 1 1 1 1 1 1 1 6 1 1 1 1 
        1 2 2 1 1 1 1 1 1 1 1 1 1 6 1 1 
        1 2 2 1 1 1 1 1 1 1 1 6 1 1 1 1 
        1 2 2 2 1 1 1 1 1 1 1 1 1 1 6 1 
        1 b 2 2 2 2 2 2 f f 1 1 6 1 1 1 
        1 1 b 2 2 2 2 2 f f 1 1 1 5 5 5 
        1 1 1 b b b b b b b 1 1 6 5 5 5 
        1 1 1 1 1 1 1 1 1 1 1 1 1 5 5 4 
        1 1 1 1 1 1 1 1 1 1 6 1 1 4 4 1 
    `

        export const thermometer = bmp`
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 f 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 f d f 1 1 1 1 1 1 1
        1 1 1 1 1 1 f d f 1 1 1 1 1 1 1
        1 1 1 1 1 1 f d f 1 1 1 1 1 1 1
        1 1 1 1 1 1 f d f 1 1 1 1 1 1 1
        1 1 1 1 1 1 f 2 f 1 1 1 1 1 1 1
        1 1 1 1 1 1 f 2 f 1 1 1 1 1 1 1
        1 1 1 1 1 1 f 2 f 1 1 1 1 1 1 1
        1 1 1 1 1 1 f 2 f 1 1 1 1 1 1 1
        1 1 1 1 1 f 2 2 2 f 1 1 1 1 1 1
        1 1 1 1 f 2 2 2 2 2 f 1 1 1 1 1
        1 1 1 1 f 2 2 2 2 2 f 1 1 1 1 1
        1 1 1 1 1 f 2 2 2 f 1 1 1 1 1 1
        1 1 1 1 1 1 f f f 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    `

        export const led_light_sensor = bmp`
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 8 8 8 8 5 5 5 8 8 8 8 1 1 1
        1 1 8 8 8 5 4 4 4 5 8 8 8 1 1 1
        1 1 8 8 8 5 4 4 4 5 8 8 8 1 1 1
        1 1 8 8 8 5 4 4 4 5 8 8 8 1 1 1
        1 1 8 8 8 8 5 5 5 8 8 8 8 1 1 1
        1 1 8 8 5 8 8 8 8 8 5 8 8 1 1 1
        1 1 8 5 8 8 8 5 8 8 8 5 8 1 1 1
        1 1 8 8 8 5 8 8 8 5 8 8 8 1 1 1
        1 1 8 8 5 8 8 5 8 8 5 8 8 1 1 1
        1 1 8 5 8 8 8 8 8 8 8 5 8 1 1 1
        1 1 8 8 8 8 8 5 8 8 8 8 8 1 1 1
        1 1 8 8 8 8 8 8 8 8 8 8 8 1 1 1
        1 1 8 8 8 2 2 2 2 2 8 8 8 1 1 1
        1 1 8 f f f f f f f f f 8 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    `

        export const microphone = bmp`
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 b c 1 1 1 1 1 1 1
        1 1 1 1 1 1 b c c c 1 1 1 1 1 1
        1 1 1 1 1 1 b c c c 1 1 1 1 1 1
        1 1 1 1 1 1 b c c c 1 1 1 1 1 1
        1 1 1 1 1 1 b c c c 1 1 1 1 1 1
        1 1 1 1 f 1 c c c c 1 f 1 1 1 1
        1 1 1 1 f 1 c c c c 1 f 1 1 1 1
        1 1 1 1 f 1 1 c c 1 1 f 1 1 1 1
        1 1 1 1 1 f 1 1 1 1 f 1 1 1 1 1
        1 1 1 1 1 1 f f f f 1 1 1 1 1 1
        1 1 1 1 1 1 1 f f 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 f f 1 1 1 1 1 1 1
        1 1 1 1 1 f f f f f f 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    `

        export const accelerometer = bmp`
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 8 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 8 8 8 1 1 1 1 1 1
        1 1 1 1 1 1 8 8 8 8 8 1 1 1 1 1
        1 1 1 1 1 1 6 6 8 6 6 1 1 1 1 1
        1 1 1 1 1 1 1 1 8 1 1 1 1 1 1 1
        1 1 8 6 1 1 f f f f f 1 1 1 1 1
        1 8 8 6 1 f 1 1 1 1 1 f 1 1 1 1
        8 8 8 8 8 f 1 f 1 f 1 f 1 1 1 1
        1 8 8 6 1 f 1 1 1 1 1 f 1 1 1 1
        1 1 8 6 1 1 f f f f f 8 1 1 6 1
        1 1 1 1 1 1 1 1 1 1 1 1 8 6 8 1
        1 1 1 1 1 1 1 1 1 1 1 1 6 8 8 1
        1 1 1 1 1 1 1 1 1 1 1 6 8 8 8 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    `

        //-------------
        // Large Icons:
        //-------------

        export const largeEditIcon = bmp`
        .666666666666666666666666666666.
        66666666666666666666666666666666
        66666666666666666666666666666666
        666666666666666666666666ee666666
        66666666666666666666666e44e66666
        6666666666666666666666ee442e6666
        666666666666666666666e15e222e666
        66666666666666666666e155ee2ee666
        6666666666666666666e155e44eee666
        666666666666666666e155e44eee6666
        ccccccccccccccccce155e44eeeccccc
        bbbbbbbbbbbbbbbbe155e44eeebbbbbb
        bbbbbbbbbbbbbbbe155e44eeebbbbbbb
        111111bbb11111e155e44eeebcbcbcbb
        1111111b11111e155e44eeebbbbbbbcb
        1111111b1111ede5e44eeebbbbbbbbbb
        1111111b1111edde44eeebbbbbbbbbcb
        1111111b1111edddeeeebbbbb1bbbbbb
        1111111b1111eedddeebcbbb111bbbcb
        1111111b1111eeeeee1bbbbbc1cbbbbb
        1111111b11111111111bcbbbbcbbbbcb
        1111111b11111111111bbbbbbbbbbbbb
        111111cbc111111111cbcbbbbbbbbbcb
        ccccccbbbcccccccccbbbcbcbcbcbcbb
        bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
        bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
        cccccccccccccccccccccccccccccccc
        66666666666666666666666666666666
        66666666666666666666666666666666
        66666666666666666666666666666666
        66666666666666666666666666666666
        b666666666666666666666666666666b
        .bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.
    `

        export const largeSettingsGear = bmp`
        66666666666666666666666666666666
        66666666666666666666666666666666
        666666666666666dd666666666666666
        66666666666666dddd66666666666666
        66666dddd666ddbbbbcc666dddd66666
        66666dddd666ddbbbbcc666dddd66666
        666dddbbbb66ddbbbbcc66dbbbccc666
        666dddbbbbccddbbbbccdddbbbccc666
        6666ddbbbbbbbbbbbbbbbbbbbbcc6666
        66666dbbbbbbbbbbbbbbbbbbbbc66666
        666666ccbbddbbccccbbddbbcc666666
        666666ccbbddbbc66cbbddbbcc666666
        66666dddbbbbcc6666ccbbbbdddd6666
        6666ddddbbbbc666666cbbbbdddd6666
        666dbbbbbbcc66666666ccbbbbbbc666
        6dddbbbbbbc6666666666cbbbbbbccc6
        6dddbbbbbbc6666666666cbbbbbbccc6
        6dddbbbbbbcc66666666ccbbbbbbccc6
        666cccccbbbbc6666666cbbbbcccc666
        6666ccccbbbbcc66666ccbbbbccc6666
        666666ddbbddbbc66cbbddbbcc666666
        666666ddbbddbbccccbbddbbcc666666
        66666dbbbbbbbbbbbbbbbbbbbbc66666
        6666ddbbbbbbbbbbbbbbbbbbbbcc6666
        6666ddbbbbccccbbbbccccbbbbcc6666
        6666ddbbbb66ccbbbbcc66bbbbcc6666
        66666cccc666ccbbbbcc666cccc66666
        66666cccc666ccbbbbcc666cccc66666
        66666666666666cccc66666666666666
        666666666666666cc666666666666666
        66666666666666666666666666666666
        66666666666666666666666666666666
    `

        export const linearGraph1 = bmp`
        .111111111111111111111111111111.
        11111111111111111111111111111111
        11ff1111111111111111111111111111
        11ff1111111111111111111111141111
        11ff1111111111111111111111441111
        11ff1111111111111111888888881111
        11ff1111111111111188888888881111
        11ff1111111111118888111444111111
        11ff1111111111888881114441111111
        11ff1111111118881111144411111111
        11ff1111111188811111444111111111
        11ff1111111888111114441111111111
        11ff1111118881111144411111111111
        11ff1111188811111444111111111111
        11ff1111888111114441111111111111
        11ff1118881111144411111111111111
        11ff1118811111444111111111111111
        11ff1188111114441111111111111111
        11ff1188111144411111111111111111
        11ff1881111444111111111111111111
        11ff1881114441111111111111111111
        11ff8881144411111111111111111111
        11ff8811444111111111111111111111
        11ff8814441111111111111111111111
        11ff8144411111111111111111111111
        11ff8444111111111111111111111111
        11ff8441111111111111111111111111
        11ff4411111111111111111111111111
        11ff4111111111111111111111111111
        11ffffffffffffffffffffffffffff11
        11ffffffffffffffffffffffffffff11
        1111111111111111111111111111111b
        .bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.
    `

        export const radio_set_group = bmp`
        .666666666666666666666666666666.
        66666666666666666666666666666666
        66666666666666666666666666666666
        66666666688888888888888666666666
        66666666688888888888888666666666
        66666668866666666666666886666666
        66666668866666666666666886666666
        66666886666888888888866668866666
        66666886666888888888866668866666
        66688666688666666666688666688666
        66688666688666666666688666688666
        66666668866668888886666886666666
        66666668866668888886666886666666
        66666666666886666668866666666666
        66666666666886666668866666666666
        66666666666666644666666666666666
        66666666666666644666666666666666
        66666666666664455446666666666666
        66666666666664455446666666666666
        66666666666445555554466666666666
        66666666666445555554466666666666
        66666666644555555555544666666666
        66666666644555555555544666666666
        66666666666664455446666666666666
        66666666666664455446666666666666
        66666666666664455446666666666666
        66666666666664455446666666666666
        66666666666664455446666666666666
        66666666666664455446666666666666
        66666666666664455446666666666666
        66666666666664455446666666666666
        66666666666664455446666666666666
        .666666666666666666666666666666.
    `

        export const largeDisk = bmp`
        .666666666666666666666666666666.
        66666666666666666666666666666666
        66666666666666666666666666666666
        66666bbbbbbbbbbbbbbbbbbbb6666666
        6666bb8cdddddddddddd888c8b666666
        6666b88cdddddddc88dd888c88b66666
        6666b88cddddddd888dd888c888b6666
        6666b88cddddddd888dd888c888b6666
        6666b88cddddddd888dd888c888b6666
        6666b88cddddddd888dd888c888b6666
        6666b88cdddddddddddd888c888b6666
        6666b88ccccccccccccccccc888b6666
        6666b8888888888888888888888b6666
        6666b8888888888888888888888b6666
        6666b8833333333333333333888b6666
        6666b8833333333333333333888b6666
        6666b8811111111111111111888b6666
        6666b8811111111111111111888b6666
        6666b8811ccccc1111111111888b6666
        6666b8811111111111111111888b6666
        6666b8811ccc111111111111888b6666
        6666b8811111111111111111888b6666
        6666b8811ccccccc11111111888b6666
        6666b8811111111111111111888b6666
        6666b8811111111111111111888b6666
        6666b88111111111111111118f8b6666
        6666b88111111111111111118f8b6666
        6666bb811111111111111111888b6666
        66666bbbbbbbbbbbbbbbbbbbbbbb6666
        66666666666666666666666666666666
        66666666666666666666666666666666
        b666666666666666666666666666666b
        .bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.
    `
    }
}

