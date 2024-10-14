namespace microdata {
    import Affine = user_interface_base.Affine
    import Bounds = user_interface_base.Bounds
    import Screen = user_interface_base.Screen
    import IPlaceable = user_interface_base.IPlaceable
    import Vec2 = user_interface_base.Vec2
    import IComponent = user_interface_base.IComponent

    /**
     * See .setOutlineColour()
     */
    const DEFAULT_CURSOR_OUTLINE_COLOUR = 9

    export type CursorCancelHandler = () => void

    export enum CursorDir {
        Up,
        Down,
        Left,
        Right,
        Back,
    }

    export interface CursorState {
        navigator: INavigator 
        pos: Vec2
        ariaId: string
        size: Bounds
    }

    export class Cursor implements IComponent, IPlaceable {
        xfrm: Affine
        navigator: INavigator
        cancelHandlerStack: CursorCancelHandler[]
        moveStartMs: number
        moveDest: Vec2
        ariaPos: Vec2
        ariaId: string
        size: Bounds
        visible = true

        resetOutlineColourOnMove = false
        private cursorOutlineColour: number

        constructor() {
            this.xfrm = new Affine()
            this.cancelHandlerStack = []
            this.moveDest = new Vec2()
            this.setSize()
            
            this.cursorOutlineColour = DEFAULT_CURSOR_OUTLINE_COLOUR
        }

        public moveTo(pos: Vec2, ariaId: string, sizeHint: Bounds) {
            if (this.resetOutlineColourOnMove)
                this.setOutlineColour(DEFAULT_CURSOR_OUTLINE_COLOUR)

            this.setSize(sizeHint)
            this.moveDest.copyFrom(pos)
            this.moveStartMs = control.millis()
            this.setAriaContent(ariaId)
        }

        public setAriaContent(ariaId: string, ariaPos: Vec2 = null) {
            this.ariaId = ariaId || ""
            this.ariaPos = ariaPos
        }

        public snapTo(x: number, y: number, ariaId: string, sizeHint: Bounds) {
            this.setSize(
                sizeHint ||
                    new Bounds({ left: 0, top: 0, width: 16, height: 16 })
            )
            this.moveDest.x = this.xfrm.localPos.x = x
            this.moveDest.y = this.xfrm.localPos.y = y
            this.setAriaContent(ariaId)
        }

        public setSize(size?: Bounds) {
            size =
                size || new Bounds({ left: 0, top: 0, width: 16, height: 16 })
            if (this.size) this.size.copyFrom(size)
            else this.size = size.clone()
        }

        public setOutlineColour(colour: number = 9) { // 9 is the DEFAULT_CURSOR_OUTLINE_COLOUR
            this.cursorOutlineColour = colour
        }

        public saveState(): CursorState {
            return {
                navigator: this.navigator,
                pos: this.xfrm.localPos.clone(),
                ariaId: this.ariaId,
                size: this.size.clone(),
            }
        }

        public restoreState(state: CursorState) {
            this.navigator = state.navigator
            this.xfrm.localPos.copyFrom(state.pos)
            this.moveDest.copyFrom(state.pos)
            this.ariaId = state.ariaId
            this.size.copyFrom(state.size)
        }

        public move(dir: CursorDir): Button {
            return this.navigator.move(dir)
        }

        public click(): boolean {
            let target = this.navigator.getCurrent() //.sort((a, b) => a.z - b.z);
            if (target && target.clickable()) {
                target.toggleSelected()
                target.click()
                profile()
                return true
            }
            return false
        }

        public cancel(): boolean {
            if (this.cancelHandlerStack.length) {
                this.cancelHandlerStack[this.cancelHandlerStack.length - 1]()
                return true
            }
            return false
        }

        update() {
            this.xfrm.localPos.copyFrom(this.moveDest)
        }

        draw() {
            if (!this.visible) return

            for (let dist = 1; dist <= 3; dist++) {
                Screen.outlineBoundsXfrm(
                    this.xfrm,
                    this.size,
                    dist,
                    this.cursorOutlineColour
                )
            }

            const text = accessibility.ariaToTooltip(this.ariaId)
            if (text) {
                const pos = this.ariaPos || this.xfrm.localPos
                const n = text.length
                const font = microdata.font
                const w = font.charWidth * n
                const h = font.charHeight
                const x = Math.max(
                    Screen.LEFT_EDGE + 1,
                    Math.min(Screen.RIGHT_EDGE - 1 - w, pos.x - (w >> 1))
                )
                const y = Math.min(
                    pos.y + (this.size.width >> 1) + (font.charHeight >> 1) + 1,
                    Screen.BOTTOM_EDGE - 1 - font.charHeight
                )
                Screen.fillRect(x - 1, y - 1, w + 1, h + 2, 15)
                Screen.print(text, x, y, 1, font)
            }
        }
    }
}
