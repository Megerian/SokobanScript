import {LURD_CHAR} from "../Sokoban/LevelFormat"
import {DIRECTION, Directions} from "../Sokoban/Directions"

/**
 * This class stores the performed moves / pushes in the game in a "movement history".
 *
 * This is needed for offering "undo" and "redo" operations in the game.
 */
export class MoveHistory {

    private _lurd         = ""
    private playedMoveCount  = 0

    /** Returns the lurd string of all played moves - that is: excluding undone moves. */
    get lurd(): string {
        return this._lurd.substring(0, this.playedMoveCount)
    }

    /** Returns the complete move history as lurd string, that is: including undone moves. */
    get totalLurd(): string {
        return this._lurd
    }

    /** Returns the total number of moves in the history including undone moves. */
    getTotalMoveCount(): number {
        return this._lurd.length
    }

    /** Returns the number of played moves (that is: excluding undone moves). */
    getPlayedMoveCount(): number {
        return this.playedMoveCount
    }

    /**
     * Returns the move history as "save game" lurd.
     * The current position in the lurd is marked with "*"
     */
    getSaveGameLURD(): string {
        if(this.getNextMoveLURDChar() == null) {
            return this.lurd
        } else {
            return this.totalLurd.substring(0, this.playedMoveCount) + "*" + this.totalLurd.substring(this.playedMoveCount)
        }
    }

    /** Adds the given 'move' to the movement history. */
    addMove(move: LURD_CHAR) {

        if (this.playedMoveCount == this.getTotalMoveCount()) {   // no undone moves
            this._lurd += move
            this.playedMoveCount++
        }
        else {
            const undoneMove = this.totalLurd[this.playedMoveCount]
            if(move === undoneMove) {
                this.playedMoveCount++     // we have just played the undone move again
            } else {
                this._lurd = this.totalLurd.substring(0, this.playedMoveCount) // different move => delete the rest of the old history
                this._lurd += move
                this.playedMoveCount++
            }
        }
    }

    /**
     * Performs an undo of the last played move
     * and returns the undone movement or null
     * in case there is no movement to be undone.
     */
    undoMove(): LURD_CHAR | null {
        if(this.playedMoveCount == 0) {
            return null
        }

        this.playedMoveCount--

        return this.getNextMoveLURDChar()
    }

    /**
     * Returns the next move (= the first undone move) in the history
     * or null in case there is no next move.
     */
    getNextMoveLURDChar(): LURD_CHAR | null {
        if (this.playedMoveCount == this.getTotalMoveCount()) {   // no undone moves
            return null
        } else {
            return this.totalLurd[this.playedMoveCount] as LURD_CHAR
        }
    }

    /**
     * Returns the direction of the last done move or null if no move has been played, yet.
     */
    getLastDoneMoveDirection(): DIRECTION | null {
        if(this.getPlayedMoveCount() == 0) return null

        return Directions.getDirectionFromLURDChar(this.lurd.charAt(this.getPlayedMoveCount()-1))
    }

    clear() {
         this._lurd         = ""
         this.playedMoveCount  = 0
    }
}