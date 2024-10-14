namespace microdata {
    import Affine = user_interface_base.Affine
    import Bounds = user_interface_base.Bounds
    import Sprite = user_interface_base.Sprite
    import Screen = user_interface_base.Screen
    import IComponent = user_interface_base.IComponent
    import ISizable = user_interface_base.ISizable 
    import IPlaceable = user_interface_base.IPlaceable

    export class Borders {
        constructor(
            public top: number,
            public bottom: number,
            public left: number,
            public right: number
        ) {}
    }

    export class ButtonStyle {
        constructor(
            public fill: number,
            public borders: Borders,
            public shadow: boolean
        ) {}
    }

    export namespace ButtonStyles {
        export const ShadowedWhite = new ButtonStyle(
            1,
            new Borders(1, 12, 1, 1),
            true
        )
        export const LightShadowedWhite = new ButtonStyle(
            1,
            new Borders(1, 11, 1, 1),
            true
        )
        export const FlatWhite = new ButtonStyle(
            1,
            new Borders(1, 1, 1, 1),
            false
        )
        /*
        export const RectangleWhite = new ButtonStyle(
            1,
            new Borders(0, 0, 0, 0),
            false
        )
        */
        export const BorderedPurple = new ButtonStyle(
            11,
            new Borders(12, 12, 12, 12),
            false
        )
        export const RedBorderedWhite = new ButtonStyle(
            1,
            new Borders(2, 2, 2, 2),
            false
        )
        export const Transparent = new ButtonStyle(
            0,
            new Borders(0, 0, 0, 0),
            false
        )
    }

    export function borderLeft(style: ButtonStyle) {
        return style.borders.left ? 1 : 0
    }

    export function borderTop(style: ButtonStyle) {
        return style.borders.top ? 1 : 0
    }

    export function borderRight(style: ButtonStyle) {
        return style.borders.right ? 1 : 0
    }

    export function borderBottom(style: ButtonStyle) {
        return style.borders.bottom ? 1 : 0
    }

    export function borderWidth(style: ButtonStyle) {
        return borderLeft(style) + borderRight(style)
    }

    export function borderHeight(style: ButtonStyle) {
        return borderTop(style) + borderBottom(style)
    }

    export class ButtonBase implements IComponent, ISizable, IPlaceable {
        public icon: Sprite
        private xfrm_: Affine
        private style: ButtonStyle

        constructor(x: number, y: number, style: ButtonStyle, parent: Affine) {
            this.xfrm_ = new Affine()
            this.xfrm.localPos.x = x
            this.xfrm.localPos.y = y
            this.style = style
            this.xfrm.parent = parent
        }

        public get xfrm() {
            return this.xfrm_
        }
        public get width() {
            return this.bounds.width
        }
        public get height() {
            return this.bounds.height
        }

        public get bounds() {
            // Returns bounds in local space
            return Bounds.GrowXY(
                this.icon.bounds,
                borderLeft(this.style),
                borderTop(this.style)
            )
        }

        public get rootXfrm(): Affine {
            let xfrm = this.xfrm
            while (xfrm.parent) {
                xfrm = xfrm.parent
            }
            return xfrm
        }

        public buildSprite(img: Bitmap) {
            this.icon = new Sprite({
                parent: this,
                img,
            })
            this.icon.xfrm.parent = this.xfrm
        }

        public getImage() {
            return this.icon.image
        }

        public occlusions(bounds: Bounds) {
            return this.icon.occlusions(bounds)
        }

        public setVisible(visible: boolean) {
            this.icon.invisible = !visible
            if (!visible) {
                this.hover(false)
            }
        }

        public visible() {
            return !this.icon.invisible
        }

        public hover(hov: boolean) {}
        public update() {}

        isOffScreenX(): boolean {
            return this.icon.isOffScreenX()
        }

        draw() {
            this.drawStyle()
            this.drawIcon()
        }

        private drawIcon() {
            this.icon.draw()
        }

        private drawStyle() {
            if (this.style.fill)
                Screen.fillBoundsXfrm(
                    this.xfrm,
                    this.icon.bounds,
                    this.style.fill
                )
            if (this.style.borders)
                Screen.outlineBoundsXfrm4(
                    this.xfrm,
                    this.icon.bounds,
                    1,
                    this.style.borders
                )
            if (this.style.shadow) {
                Screen.setPixelXfrm(
                    this.xfrm,
                    this.icon.bounds.left - 1,
                    this.icon.bounds.bottom,
                    this.style.borders.bottom
                )
                Screen.setPixelXfrm(
                    this.xfrm,
                    this.icon.bounds.right + 1,
                    this.icon.bounds.bottom,
                    this.style.borders.bottom
                )
            }
        }
    }

    export class Button extends ButtonBase {
        private iconId: string | Bitmap
        private _ariaId: string
        public onClick?: (button: Button) => void
        public selected: boolean
        private dynamicBoundaryColorsOn: boolean
        private boundaryColor: number
        public pressable: boolean

        public get ariaId(): string {
            return (
                this._ariaId ||
                (typeof this.iconId === "string" ? <string>this.iconId : "")
            )
        }

        public set ariaId(value: string) {
            this._ariaId = value
        }

        reportAria(force = false) {
            const msg: accessibility.TileAccessibilityMessage = {
                type: "tile",
                value: this.ariaId,
                force,
            }
            accessibility.setLiveContent(msg) 
        }

        constructor(opts: {
            parent?: IPlaceable
            style?: ButtonStyle
            icon: string | Bitmap
            ariaId?: string
            x: number
            y: number
            onClick?: (button: Button) => void,
            dynamicBoundaryColorsOn?: boolean
            boundaryColor?: number,
            flipIcon?: boolean
        }) {
            super(
                opts.x,
                opts.y,
                opts.style || ButtonStyles.Transparent,
                opts.parent && opts.parent.xfrm
            )
            this.iconId = opts.icon
            this._ariaId = opts.ariaId
            this.onClick = opts.onClick
            this.buildSprite(this.image_())

            if (opts.flipIcon) {
                this.icon.image = this.icon.image.clone()
                this.icon.image.flipY()
            }

            this.selected = false
            this.pressable = true

            if (opts.dynamicBoundaryColorsOn == null) {
                opts.dynamicBoundaryColorsOn = false
            }
            else {
                this.dynamicBoundaryColorsOn = opts.dynamicBoundaryColorsOn
                this.boundaryColor = 2
            }

            if (opts.boundaryColor != null) {
                this.dynamicBoundaryColorsOn = true
                this.boundaryColor = opts.boundaryColor
            }
        }

        public getIcon() {
            return this.iconId
        }

        public toggleDynamicBoundaryColors() {
            this.dynamicBoundaryColorsOn = !this.dynamicBoundaryColorsOn
        }

        public toggleSelected(): void {
            this.selected = !this.selected
        }

        private image_() {
            return typeof this.iconId == "string"
                ? icons.get(this.iconId)
                : this.iconId
        }
        
        public setIcon(iconId: string, img?: Bitmap) {
            this.iconId = iconId
            if (img) this.icon.setImage(img)
            else this.buildSprite(this.image_())
        }

        public clickable() {
            return this.visible() && this.pressable
        }

        public click() {
            if (!this.clickable()) {
                return
            }
            if (this.onClick) {
                this.onClick(this)
            }
        }

        public draw() {
            super.draw()

            if (this.dynamicBoundaryColorsOn) {
                const boundaryColour = (this.selected && this.pressable) ? 7: this.boundaryColor 

                for (let dist = 1; dist <= 3; dist++) {
                    Screen.outlineBoundsXfrm(
                        this.xfrm,
                        this.icon.bounds,
                        dist,
                        boundaryColour
                    )
                }
            }
        }
    }
}
