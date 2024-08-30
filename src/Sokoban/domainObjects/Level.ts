/**
 * A [Level] contains all data of a specific Sokoban level.
  */
import {Board} from "../../board/Board"
import {NONE} from "../../app/SokobanApp"
import {MoveHistory} from "../../app/MoveHistory"
import {Snapshot} from "./Snapshot"
import {Solution} from "./Solution"

export class Level {

    readonly width: number
    readonly height: number
    readonly boxCount: number

    notes   = ""
    readonly snapshots = new Map<string, Snapshot>()
    readonly solutions  = new Map<string, Solution>()

    title  = ""
    author = ""

    letsLogicID = NONE
    levelNumber = 1                         // number of the level in the level collection

    readonly history = new MoveHistory()

    constructor(public readonly board: Board) {
        this.width    = board.width
        this.height   = board.height
        this.boxCount = board.boxCount
    }

    get hasSolutions(): boolean {
        return this.solutions.size > 0
    }

    get hasSnapshots(): boolean {
        return this.snapshots.size > 0
    }

    /**
     *  Adds the solution to this level and returns whether this
     *  has been successful. False is returned when the solution
     *  is already stored for this level.
     *
     * @param solution  the solution to add
     */
    addSolution(solution: Solution): boolean {
        if(!this.solutions.has(solution.lurd)) {
            this.solutions.set(solution.lurd, solution)
            return true
        }
        return false
    }

    /**
     *  Adds the snapshot to this level and returns whether this
     *  has been successful. False is returned when the snapshot
     *  is already stored for this level.
     *
     * @param snapshot  the snapshot to add
     */
    addSnapshot(snapshot: Snapshot) {
        if(!this.snapshots.has(snapshot.lurd)) {
            this.snapshots.set(snapshot.lurd, snapshot)
            return true
        }
        return false
    }
}