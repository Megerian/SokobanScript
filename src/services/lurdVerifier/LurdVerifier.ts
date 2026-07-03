/**
 * Class for checking whether strings containing the move direction characters (l, u, r and d)
 * create a valid [Snapshot] or [Solution] for the given `board`.
 *
 * Example usage:
 * val snapshot = LURDVerifierForwardPlay(puzzle).verifyLURD("ldurldurld")
 * when(snapshot) {
 *   is Solution -> ...       "it's a solution for the puzzle
 *   is Snapshot -> ...       "it's snapshot for the puzzle
 *   is null     -> ...       "invalid lurd for puzzle
 * }
 */
import { Board } from "../../board/Board"
import { Snapshot } from "../../Sokoban/domainObjects/Snapshot"
import { LURD_CHARS } from "../../Sokoban/PuzzleFormat"
import { NONE } from "../../app/SokobanApp"
import { type DIRECTION, Directions } from "../../Sokoban/Directions"
import { Metrics } from "../../Sokoban/domainObjects/Metrics"
import { Solution } from "../../Sokoban/domainObjects/Solution"

const VALID_LURD_SET = new Set<string>([...LURD_CHARS, '*'])

export class LURDVerifier {

    private originalBoard: Board

    constructor(passedBoard: Board) {
        this.originalBoard = passedBoard.clone()
    }


    /**
     * Returns a [Snapshot] created from the passed [lurdString]
     * or `null` if the [lurdString] is invalid for the [board].
     *
     * If the puzzle is solved by the [lurdString] then a `Solution`
     * is returned (which is a subtype of `Snapshot`).
     *
     * The [lurdString] must only contain these characters: l,u,r,d,L,U,R,D,*
     * This also means that the [lurdString] mustn't be run length encoded.
     *
     * The returned [Snapshot] contains the validated and corrected LURD string.
     * That LURD string is corrected in the following way:
     * <ol>
     * <li> moves are represented by lower case letters
     * <li> pushes are represented by upper case letters
     * </ol>
     * If it is a [Solution] then all unnecessary additional trailing moves are pruned
     * so the LURD string ends as soon as the puzzle is solved.
     *
     * The metrics (moves, pushes, box lines, box changes, pushing sessions and player lines)
     * are calculated and stored.
     *
     * This is the main code to compute the metrics for a snapshot.
     *
     * This function returns `null` in the following cases:
     * - the [lurdString] contains any invalid characters
     * - any of the movements can't be performed (for instance a move into a wall)
     * - the [lurdString] is empty
     *
     * Example usage:
     * const snapshot = new LURDVerifier(board).verifyLURD("ldurldurld")
     *
     * if (snapshot instanceof Solution) {
     * // it's a solution for the puzzle
     * } else if (snapshot instanceof Snapshot) {
     * // it's snapshot for the puzzle
     * }
     */
    verifyLURD(lurdString: string): Snapshot | null {
        if (this.isValidSnapshotLURD(lurdString)) {
            return this.doVerifyLURD(lurdString)
        }
        return null
    }

    private doVerifyLURD(lurdString: string): Snapshot | null {

        const board = this.originalBoard.clone()
        let metrics = new Metrics()             // Metrics of the snapshot

        let metricsDoneMoves = metrics      // Metrics of a snapshot until the "*" character is found

        let lastPushedBoxPosition = NONE // initialized to impossible value
        let lastMoveDirection = NONE      // initialized to impossible value
        let lastMovementWasMove = true
        const validatedLURD: string[] = []                // The verified and corrected lurd string
        let hasMarker = false

        const updateMetricsForAPush = (pushDirection: number, currentBoxPos: number) => {
            metrics.moveCount++
            metrics.pushCount++

            const anotherThanPreviousBoxHasBeenPushed = lastPushedBoxPosition == NONE || currentBoxPos !== lastPushedBoxPosition

            if (anotherThanPreviousBoxHasBeenPushed || lastMovementWasMove)
                metrics.boxLineCount++

            if (anotherThanPreviousBoxHasBeenPushed)
                metrics.boxChangeCount++

            if (lastMovementWasMove)
                metrics.pushingSessionCount++

            if (pushDirection != lastMoveDirection)
                metrics.playerLineCount++
        }


        const updateMetricsForAMove = (moveDirection: number) => {
            metrics.moveCount++

            if (moveDirection != lastMoveDirection)
                metrics.playerLineCount++
        }

        const createSnapshot = () => {
            const finalString = validatedLURD.join("")
            return !hasMarker ? new Solution(finalString, metrics) :
                new Snapshot(finalString, metricsDoneMoves)
        }


        for (const lurdChar of lurdString) {

            if (lurdChar == '*') {           // Keep the position marker
                validatedLURD.push('*')         // (see: Snapshot class)
                metricsDoneMoves = metrics.clone()
                hasMarker = true
                continue
            }

            const direction = Directions.getDirectionFromLURDChar(lurdChar)

            const newPlayerPosition = board.getNeighborPosition(board.playerPosition, direction)
            const newBoxPosition = board.getNeighborPosition(newPlayerPosition, direction)

            if (board.isBox(newPlayerPosition)) {       // move including a push

                if (!LURDVerifier.movePlayerToDirection(board, direction))
                    return null

                validatedLURD.push(Directions.getPushCharForDirection(direction))

                updateMetricsForAPush(direction, newPlayerPosition)

                lastPushedBoxPosition = newBoxPosition
                lastMovementWasMove = false

                if (board.isSolved()) {
                    return createSnapshot()
                }
            } else {                                    // move without a push

                if (!LURDVerifier.movePlayerToDirection(board, direction)) {
                    return null
                }

                validatedLURD.push(Directions.getMoveCharForDirection(direction))

                updateMetricsForAMove(direction)

                lastMovementWasMove = true
            }

            lastMoveDirection = direction
        }

        const finalString = validatedLURD.join("")
        return new Snapshot(finalString, metricsDoneMoves)
    }


    private static movePlayerToDirection(board: Board, direction: DIRECTION): boolean {

        const newPlayerPosition = board.getPlayerNeighborPosition(direction)
        if (board.isWall(newPlayerPosition)) return false

        if (board.isBox(newPlayerPosition)) {
            const newBoxPosition = board.getNeighborPosition(newPlayerPosition, direction)
            const boxHasBeenPushed = board.pushBox(newPlayerPosition, newBoxPosition)
            if (!boxHasBeenPushed) {
                return false
            }
        }

        board.playerPosition = newPlayerPosition

        return true
    }

    private isValidSnapshotLURD(lurdString: string): boolean {
        if (lurdString.length === 0) {
            return false
        }

        for (const char of lurdString) {
            if (!VALID_LURD_SET.has(char)) {
                return false
            }
        }

        return true
    }
}