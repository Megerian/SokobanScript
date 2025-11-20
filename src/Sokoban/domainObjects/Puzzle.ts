/**
 * A Puzzle contains all data of a specific Sokoban puzzle.
 */
import { Board } from "../../board/Board"
import { NONE } from "../../app/SokobanApp"
import { MoveHistory } from "../../app/MoveHistory"
import { Snapshot } from "./Snapshot"
import { Solution } from "./Solution"

export class Puzzle {

    readonly width: number
    readonly height: number
    readonly boxCount: number

    notes = ""

    /** Snapshots keyed by their LURD string. */
    readonly snapshots = new Map<string, Snapshot>()

    /** Solutions keyed by their LURD string. */
    readonly solutions = new Map<string, Solution>()

    title  = ""
    author = ""

    /** Optional ID used by LetsLogic (if present in the collection file). */
    letsLogicID = NONE

    /** Number of this puzzle within its collection. */
    puzzleNumber = 1

    /** Move history used when this puzzle is played. */
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
     * Adds the given solution to this puzzle.
     *
     * @return true if the solution was added; false if a solution
     *         with the same LURD already exists.
     */
    addSolution(solution: Solution): boolean {
        if (!this.solutions.has(solution.lurd)) {
            this.solutions.set(solution.lurd, solution)
            return true
        }
        return false
    }

    /**
     * Adds the given snapshot to this puzzle.
     *
     * @return true if the snapshot was added; false if a snapshot
     *         with the same LURD already exists.
     */
    addSnapshot(snapshot: Snapshot): boolean {
        if (!this.snapshots.has(snapshot.lurd)) {
            this.snapshots.set(snapshot.lurd, snapshot)
            return true
        }
        return false
    }
}