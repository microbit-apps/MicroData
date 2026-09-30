interface Math {
    idiv(x: number, y: number): number
}

interface Array<T> {
    removeAt(index: number): T
}

interface Screen {
    (): Bitmap
}

interface String {
    replaceAll(search: string, replacement: string): string
}
