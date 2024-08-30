import {Metrics} from "./Metrics"

/**
 * A [Snapshot] represents the moves the player has made for reaching a specific
 * board position.
 *
 *   Example:
 *   `uuurrr`  means: the player has moved 3 times up and three times right.
 *
 * The snapshot may contain "undone" moves. If there are undone moves,
 * the played moves and the undone moves are separated by a "*".
 *    Example:
 *    `uuur*rr`  means: the player has moved 3 times and one time right.
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
    readonly createdDate = Date.now()

    name = ""
    notes= ""

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
}