import {Metrics} from "./Metrics"

/**
 * A [Snapshot] represents the moves the player has made for reaching a specific
 * board position.
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

    readonly createdDate: number = Date.now()

    name = ""
    notes = ""

    constructor(public lurd: string, metrics: Metrics = new Metrics()) {
        const { pushCount, moveCount, boxLineCount, boxChangeCount, pushingSessionCount, playerLineCount } = metrics

        this.pushCount          = pushCount
        this.moveCount          = moveCount
        this.boxLineCount       = boxLineCount
        this.boxChangeCount     = boxChangeCount
        this.pushingSessionCount = pushingSessionCount
        this.playerLineCount    = playerLineCount

        this.uniqueID = Snapshot.counter++
    }

    toString = () => this.lurd

    equals(other: Snapshot): boolean {
        return other.lurd === this.lurd
    }

    private static compareRemainingMetrics(a: Snapshot, b: Snapshot): number {
        if (a.boxLineCount       !== b.boxLineCount)       return a.boxLineCount       - b.boxLineCount
        if (a.boxChangeCount     !== b.boxChangeCount)     return a.boxChangeCount     - b.boxChangeCount
        if (a.pushingSessionCount !== b.pushingSessionCount) return a.pushingSessionCount - b.pushingSessionCount
        if (a.playerLineCount    !== b.playerLineCount)    return a.playerLineCount    - b.playerLineCount
        return a.createdDate - b.createdDate
    }

    static compareByPushQuality(a: Snapshot, b: Snapshot): number {
        if (a.pushCount !== b.pushCount) return a.pushCount - b.pushCount
        if (a.moveCount !== b.moveCount) return a.moveCount - b.moveCount
        return Snapshot.compareRemainingMetrics(a, b)
    }

    static compareByMoveQuality(a: Snapshot, b: Snapshot): number {
        if (a.moveCount !== b.moveCount) return a.moveCount - b.moveCount
        if (a.pushCount !== b.pushCount) return a.pushCount - b.pushCount
        return Snapshot.compareRemainingMetrics(a, b)
    }
}