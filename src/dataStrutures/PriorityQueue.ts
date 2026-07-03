export type Comparator<T> = (a: T, b: T) => number

/**
 * A highly optimized binary heap priority queue.
 * Suitable for high-frequency pathfinding operations.
 */
export default class PriorityQueue<T> {

    private readonly data: T[] = []

    /** Returns the current number of elements in the queue. */
    get size(): number {
        return this.data.length
    }

    constructor(private comparator: Comparator<T>) {}

    /** Adds a value to the priority queue. */
    add(value: T): void {
        this.data.push(value)
        this._bubbleUp(this.data.length - 1)
    }

    /**
     * Removes and returns the highest priority element.
     * Throws an error if the queue is empty.
     */
    removeFirst(): T {
        if (this.data.length === 0) {
            throw new Error("Empty queue")
        }

        const ret = this.data[0]
        const last = this.data.pop()

        if (this.data.length > 0 && last !== undefined) {
            this.data[0] = last
            this._bubbleDown(0)
        }
        return ret
    }

    /** Returns true if the queue contains no elements. */
    isEmpty(): boolean {
        return this.data.length === 0
    }

    /** Returns true if the queue contains at least one element. */
    isNotEmpty(): boolean {
        return this.data.length > 0
    }

    /**
     * Returns the highest priority element without removing it.
     * Throws an error if the queue is empty.
     */
    peek(): T {
        if (this.data.length === 0) {
            throw new Error("Empty queue")
        }
        return this.data[0]
    }

    /** Clears all elements from the queue. */
    clear(): void {
        this.data.length = 0
    }

    private _bubbleUp(pos: number): void {
        const item = this.data[pos]

        while (pos > 0) {
            const parent = (pos - 1) >>> 1

            if (this.comparator(item, this.data[parent]) < 0) {
                this.data[pos] = this.data[parent]
                pos = parent
            } else {
                break
            }
        }
        this.data[pos] = item
    }

    private _bubbleDown(pos: number): void {
        const last = this.data.length - 1
        const item = this.data[pos]

        while (true) {
            const left = (pos << 1) + 1
            const right = left + 1
            let minIndex = pos

            if (left <= last && this.comparator(this.data[left], item) < 0) {
                minIndex = left
            }

            if (right <= last && this.comparator(this.data[right], minIndex === pos ? item : this.data[left]) < 0) {
                minIndex = right
            }

            if (minIndex !== pos) {
                this.data[pos] = this.data[minIndex]
                pos = minIndex
            } else {
                break
            }
        }
        this.data[pos] = item
    }
}