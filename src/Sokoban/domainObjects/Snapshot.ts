import {Metrics} from "./Metrics"

/**
 * A [Snapshot] represents the moves the player has made for reaching a specific
 * board position.
 *
 * Example:
 *   `uuurrr` means: the player has moved 3 times up and three times right.
 *
 * The snapshot may contain "undone" moves. If there are undone moves,
 * the played moves and the undone moves are separated by a "*".
 *    Example:
 *    `uuur*rr` means: the player has moved 3 times up and one time right.
 * There are two moves to the right which have been undone.
 *
 * A snapshot is classified as (the one and only) `SaveGame` based on the name of the snapshot
 * which must be "SaveGame" in that case.
 *
 * @property lurd  the LURD-representation of the played player moves
 */
export class Snapshot {

    private static counter = 0

    readonly uniqueID: number
    readonly pushCount: number
    readonly moveCount: number
    readonly boxLineCount: number
    readonly boxChangeCount: number
    readonly pushingSessionCount: number
    readonly playerLineCount: number

    /**
     * Creation time in milliseconds since epoch (as returned by Date.now()).
     * Lower value means "older".
     */
    readonly createdDate: number = Date.now()

    name = ""
    notes = ""

    constructor(public lurd: string, metrics: Metrics = new Metrics()) {
        this.pushCount 		     = metrics.pushCount
        this.moveCount 	         = metrics.moveCount
        this.boxLineCount        = metrics.boxLineCount
        this.boxChangeCount      = metrics.boxChangeCount
        this.pushingSessionCount = metrics.pushingSessionCount
        this.playerLineCount     = metrics.playerLineCount

        this.uniqueID = Snapshot.counter++
    }

    toString = () => this.lurd

    equals(other: Snapshot): boolean {
        return other.lurd === this.lurd
    }

    /**
     * Comparator: "best by pushes" (ascending).
     * Lower value is better for every metric.
     *
     * Can be used with Array.sort:
     *   solutions.sort(Snapshot.compareByPushQuality)
     */
    static compareByPushQuality(a: Snapshot, b: Snapshot): number {
        if (a.pushCount          !== b.pushCount)          return a.pushCount          - b.pushCount
        if (a.moveCount          !== b.moveCount)          return a.moveCount          - b.moveCount
        if (a.boxLineCount       !== b.boxLineCount)       return a.boxLineCount       - b.boxLineCount
        if (a.boxChangeCount     !== b.boxChangeCount)     return a.boxChangeCount     - b.boxChangeCount
        if (a.pushingSessionCount !== b.pushingSessionCount)
            return a.pushingSessionCount - b.pushingSessionCount
        if (a.playerLineCount    !== b.playerLineCount)    return a.playerLineCount    - b.playerLineCount

        // createdDate: earlier (smaller value) is better
        return a.createdDate - b.createdDate
    }

    /**
     * Comparator: "best by moves" (ascending).
     * Lower value is better for every metric.
     *
     * Can be used with Array.sort:
     *   solutions.sort(Snapshot.compareByMoveQuality)
     */
    static compareByMoveQuality(a: Snapshot, b: Snapshot): number {
        if (a.moveCount          !== b.moveCount)          return a.moveCount          - b.moveCount
        if (a.pushCount          !== b.pushCount)          return a.pushCount          - b.pushCount
        if (a.boxLineCount       !== b.boxLineCount)       return a.boxLineCount       - b.boxLineCount
        if (a.boxChangeCount     !== b.boxChangeCount)     return a.boxChangeCount     - b.boxChangeCount
        if (a.pushingSessionCount !== b.pushingSessionCount)
            return a.pushingSessionCount - b.pushingSessionCount
        if (a.playerLineCount    !== b.playerLineCount)    return a.playerLineCount    - b.playerLineCount

        // createdDate: earlier (smaller value) is better
        return a.createdDate - b.createdDate
    }
}
