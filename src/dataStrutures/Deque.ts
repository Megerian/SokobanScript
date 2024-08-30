
// from https://github.com/blakeembrey/deque/blob/master/src/index.ts

export class Deque<T> {

    private head = 0
    private tail = 0
    private mask = 1
    private list = new Array<T | undefined>(2)

    constructor(elements?: Iterable<T>) {
        if (elements) {
            this.addLastAll(elements)
        }
    }

    private _resize(size: number, length: number) {
        const { head, mask } = this

        this.head = 0
        this.tail = size
        this.mask = length - 1

        // Optimize resize when list is already sorted.
        if (head === 0) {
            this.list.length = length
            return
        }

        const sorted = new Array<T | undefined>(length)
        for (let i = 0; i < size; i++) sorted[i] = this.list[(head + i) & mask]
        this.list = sorted
    }

    /**  Adds the passed element at the end of the deque. */
    add(element: T): void {
       this.addLast(element)
    }

    /**  Adds the passed element at the end of the deque. */
    addLast(element: T): void {
        this.list[this.tail] = element
        this.tail = (this.tail + 1) & this.mask
        if (this.head === this.tail) this._resize(this.list.length, this.list.length << 1)
    }

    /**  Adds the passed element at the start of the deque. */
    addFirst(element: T): this {
        this.head = (this.head - 1) & this.mask
        this.list[this.head] = element
        if (this.head === this.tail) this._resize(this.list.length, this.list.length << 1)
        return this
    }

    /** Removes all elements from the deque. */
    clear() {
        this.head = 0
        this.tail = 0
    }

    /** Adds all given elements to the end of the deque. */
    addLastAll(elements: Iterable<T>) {
        for (const element of elements) this.addLast(element)
        return this
    }

    /** Adds all given elements to the start of the dequeue. */
    addStartAll(elements: Iterable<T>) {
        for (const element of elements) this.addFirst(element)
        return this
    }

    /** Returns the element at index i in the deque. */
    get(index: number) {
        const { head, size, tail, list } = this

        if ((index | 0) !== index || index >= size || index < -size) {
            throw new RangeError('deque index out of range')
        }

        const pos = ((index >= 0 ? head : tail) + index) & this.mask
        return list[pos] as T
    }

    /** Returns the first element the deque. */
    getFirst() {
        return this.get(0)
    }

    /** Returns the last element the deque. */
    getLast() {
        if (this.isEmpty()) throw new RangeError('pop from an empty deque')

        this.tail = (this.tail - 1) & this.mask
        const element = this.list[this.tail] as T
        return element
    }

    /**
     * Returns the index of the passed element in the deque or
     * -1 in case the deque does not contain the element.
     * @param element element to be searched
     * @param start  the element is searched starting from this index (defaults to 0)
     */
    indexOf(element: T, start = 0) {
        const { head, list, size, mask } = this
        const offset = start >= 0 ? start : start < -size ? 0 : size + start

        for (let i = offset; i < size; i++) {
            if (list[(head + i) & mask] === element) return i
        }

        return -1
    }

    /** Returns whether the deque contains the given element. */
    contains(element: T) {
        const { head, list, size, mask } = this

        for (let i = 0; i < size; i++) {
            if (list[(head + i) & mask] === element) return true
        }

        return false
    }

    /** Inserts the given element at the given index in the deque. */
    insert(index: number, element: T) {
        const pos = (this.head + index) & this.mask
        let cur = this.tail

        // Increase tail position by 1.
        this.tail = (this.tail + 1) & this.mask

        // Shift items forward 1 to make space for insert.
        while (cur !== pos) {
            const prev = (cur - 1) & this.mask
            this.list[cur] = this.list[prev]
            cur = prev
        }

        this.list[pos] = element
        if (this.head === this.tail) this._resize(this.list.length, this.list.length << 1)
        return this
    }

    /**  Returns the number of elements in the deque.*/
    get size() {
        return (this.tail - this.head) & this.mask
    }

    /**  Returns whether the dequeue is empty. */
    isEmpty(): boolean {
        return this.size === 0
    }

    /**  Returns whether the dequeue is not empty. */
    isNotEmpty(): boolean {
        return !this.isEmpty()
    }

    /**
     * Removes and returns the element from the end of the deque.
     * Throws RangeError in case the deque is empty.
     */
    removeLast() {
        if (this.head === this.tail) throw new RangeError('pop from an empty deque')

        this.tail = (this.tail - 1) & this.mask
        const element = this.list[this.tail] as T
        this.list[this.tail] = undefined
        if (this.size < this.mask >>> 1) this._resize(this.size, this.list.length >>> 1)
        return element
    }

    /**
     * Removes and returns the element from the start of the deque.
     * Throws RangeError in case the deque is empty.
     */
    removeFirst() {
        if (this.head === this.tail) throw new RangeError('pop from an empty deque')

        const element = this.list[this.head] as T
        this.list[this.head] = undefined
        this.head = (this.head + 1) & this.mask
        if (this.size < this.mask >>> 1) this._resize(this.size, this.list.length >>> 1)
        return element
    }

    /** Removes the element at the given index from the deque. */
    removeAtIndex(index: number) {
        if (index >= this.size || index < 0) {
            throw new RangeError('deque index out of range')
        }

        const pos = (this.head + index) & this.mask
        let cur = pos

        // Shift items backward 1 to erase position.
        while (cur !== this.tail) {
            const next = (cur + 1) & this.mask
            this.list[cur] = this.list[next]
            cur = next
        }

        // Decrease tail position by 1.
        this.tail = (this.tail - 1) & this.mask

        if (this.size < this.mask >>> 1) this._resize(this.size, this.list.length >>> 1)

        return this
    }

    /** Reverses the elements of the deque in-place. */
    reverse() {
        const { head, tail, size, mask } = this

        for (let i = 0; i < ~~(size / 2); i++) {
            const a = (tail - i - 1) & mask
            const b = (head + i) & mask

            const temp = this.list[a]
            this.list[a] = this.list[b]
            this.list[b] = temp
        }

        return this
    }

    /** Rotates the elements of the deque n steps to the right. */
    rotate(n = 1) {
        const { head, tail } = this

        if (n === 0 || head === tail) return this

        this.head = (head - n) & this.mask
        this.tail = (tail - n) & this.mask

        if (n > 0) {
            for (let i = 1; i <= n; i++) {
                const a = (head - i) & this.mask
                const b = (tail - i) & this.mask

                this.list[a] = this.list[b]
                this.list[b] = undefined
            }
        } else {
            for (let i = 0; i > n; i--) {
                const a = (tail - i) & this.mask
                const b = (head - i) & this.mask

                this.list[a] = this.list[b]
                this.list[b] = undefined
            }
        }

        return this
    }

    /** Return all elements stored in the deque. */
    toArray(): Array<T> {
        const { head, size, list, mask } = this

        const returnArray = new Array<T>()

        for (let i = 0; i < size; i++) {
            returnArray.push(list[(head + i) & mask] as T)
        }

        return returnArray
    }
}