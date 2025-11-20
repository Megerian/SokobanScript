import { LURD_CHAR } from "../Sokoban/PuzzleFormat"
import { DIRECTION, Directions } from "../Sokoban/Directions"

/**
 * Stores the move/push history of the game as a LURD string.
 *
 * The history is stored as a single string plus a "cursor" index:
 *   - history: complete LURD string (including undone moves)
 *   - playedCount: number of moves that are currently "active"
 *
 * Moves with index >= playedCount are considered "undone" and can be redone.
 */
export class MoveHistory {

    /** Complete LURD history including undone moves. */
    private history = ""

    /** Number of moves that are currently played (i.e. not undone). */
    private playedCount = 0

    /** Returns the LURD string of all played moves (excluding undone moves). */
    get lurd(): string {
        return this.history.substring(0, this.playedCount)
    }

    /** Returns the complete LURD history including undone moves. */
    get totalLurd(): string {
        return this.history
    }

    /** Returns the total number of moves in the history including undone moves. */
    getTotalMoveCount(): number {
        return this.history.length
    }

    /** Returns the number of played moves (excluding undone moves). */
    getPlayedMoveCount(): number {
        return this.playedCount
    }

    /** Returns whether there is at least one move that can be undone. */
    get hasUndo(): boolean {
        return this.playedCount > 0
    }

    /** Returns whether there is at least one move that can be redone. */
    get hasRedo(): boolean {
        return this.playedCount < this.history.length
    }

    /**
     * Returns the move history as "save game" LURD string.
     *
     * The current position in the LURD is marked with "*".
     * Example:
     *   history: "rruudd"
     *   playedCount: 4
     *   => "rruu*dd"
     */
    getSaveGameLURD(): string {
        // If there is no undone move, the plain LURD is already a valid snapshot.
        if (!this.hasRedo) {
            return this.lurd
        }

        // Insert '*' at the current cursor position.
        return (
            this.history.substring(0, this.playedCount) +
            "*" +
            this.history.substring(this.playedCount)
        )
    }

    /**
     * Adds the given move to the movement history.
     *
     * Behavior:
     *  - If no moves are undone, the move is simply appended.
     *  - If there are undone moves and the new move is equal to the next undone move,
     *    the cursor is moved forward (redo semantics).
     *  - If there are undone moves and the new move differs from the next undone move,
     *    all undone moves are discarded and the new move is appended.
     */
    addMove(move: LURD_CHAR): void {
        const total = this.history.length

        if (this.playedCount === total) {
            // No undone moves: simply append the move.
            this.history += move
            this.playedCount++
            return
        }

        // There are undone moves.
        const nextUndoneMove = this.history[this.playedCount] as LURD_CHAR

        if (move === nextUndoneMove) {
            // The user re-played the same move as the next undone move: redo it.
            this.playedCount++
        } else {
            // The user changed the history:
            // discard all undone moves and append the new one.
            this.history = this.history.substring(0, this.playedCount) + move
            this.playedCount++
        }
    }

    /**
     * Performs an "undo" of the last played move and returns the undone move.
     *
     * @return the undone LURD move char, or null if there is nothing to undo.
     */
    undoMove(): LURD_CHAR | null {
        if (!this.hasUndo) {
            return null
        }

        this.playedCount--
        return this.history[this.playedCount] as LURD_CHAR
    }

    /**
     * Performs a "redo" of the next undone move.
     *
     * This does not update the board itself – it only advances the history cursor
     * and returns the move that should be applied on the board.
     *
     * @return the redone LURD move char, or null if there is nothing to redo.
     */
    redoMove(): LURD_CHAR | null {
        if (!this.hasRedo) {
            return null
        }

        const move = this.history[this.playedCount] as LURD_CHAR
        this.playedCount++
        return move
    }

    /**
     * Returns the next move (= the first undone move) in the history
     * or null in case there is no next move.
     *
     * This is kept for compatibility with existing code, even though
     * the new redoMove() method could be used instead.
     */
    getNextMoveLURDChar(): LURD_CHAR | null {
        if (!this.hasRedo) {
            return null
        }
        return this.history[this.playedCount] as LURD_CHAR
    }

    /**
     * Returns the direction of the last done move,
     * or null if no move has been played yet.
     */
    getLastDoneMoveDirection(): DIRECTION | null {
        if (this.playedCount === 0) {
            return null
        }

        const lastMoveChar = this.history.charAt(this.playedCount - 1) as LURD_CHAR
        return Directions.getDirectionFromLURDChar(lastMoveChar)
    }

    /**
     * Replaces the entire history with the given LURD string.
     * `playedCount` is set to the given value or to the full length if omitted.
     *
     * This is useful when applying a snapshot/solution to the board and
     * synchronizing the internal undo/redo state with that snapshot.
     *
     * Example:
     *   setHistory("rruudd")              // all moves considered "played"
     *   setHistory("rruudd", 4)           // first 4 moves played, last 2 undone
     */
    setHistory(lurd: string, playedCount?: number): void {
        this.history = lurd
        this.playedCount = playedCount !== undefined ? playedCount : lurd.length
    }

    /** Clears the complete move history. */
    clear(): void {
        this.history = ""
        this.playedCount = 0
    }
}
