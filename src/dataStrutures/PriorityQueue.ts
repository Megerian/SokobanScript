export type Comparator<T> = (a: T, b: T) => number

export default class PriorityQueue<T> {

    private _size: number = 0

    private readonly data: T[]

    get size() {
        return this._size
    }

    constructor(private comparator: Comparator<T>) {
        this._size = 0
        this.data = []
    }

    add(value: T) {
        this._size++

        this.data.push(value)
        this._bubbleUp(this.data.length - 1)
    }

    removeFirst() {
        if (!this._size) throw new Error("Empty queue")
        this._size--

        const ret = this.data[0]
        const last = this.data.pop()
        if (this.data.length > 0 && last !== undefined) {
            this.data[0] = last
            this._bubbleDown(0)
        }
        return ret
    }

    isEmpty() {
        return this.size === 0
    }

    isNotEmpty() {
        return !this.isEmpty()
    }


    peek() {
        if (!this._size) throw new Error("Empty queue")
        return this.data[0]
    }

    clear() {
        this._size = 0
        this.data.length = 0
    }

    private _bubbleUp(pos: number): void {

        while (pos > 0) {
            const parent = (pos - 1) >>> 1
            if (this.comparator(this.data[pos], this.data[parent]) < 0) {
                const x = this.data[parent]
                this.data[parent] = this.data[pos]
                this.data[pos] = x
                pos = parent
            }
            else {
                break
            }
        }
    }

    private _bubbleDown(pos: number): void {

        let last = this.data.length - 1

        while (true) {
            const left = (pos << 1) + 1
            const right = left + 1
            let minIndex = pos
            if (left <= last && this.comparator(this.data[left], this.data[minIndex]) < 0) {
                minIndex = left
            }
            if (right <= last && this.comparator(this.data[right], this.data[minIndex]) < 0) {
                minIndex = right
            }
            if (minIndex !== pos) {
                const x = this.data[minIndex]
                this.data[minIndex] = this.data[pos]
                this.data[pos] = x
                pos = minIndex
            }
            else {
                break
            }
        }
    }
}