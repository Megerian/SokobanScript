/**
 * This class calculates the distance of the player to every reachable position.
 * The distances can be retrieved by calling [getDistance].
 *
 * @property board  the `Board` to operate on
 */
import {Board} from "../../board/Board"
import {Deque} from "../../dataStrutures/Deque"
import {Directions} from "../../Sokoban/Directions"

export const UNREACHABLE = -1

export class PlayerDistances {

    private readonly distanceTo: Int16Array;

    constructor(private board: Board) {
        this.distanceTo = new Int16Array(this.board.size)
    }

    private positionsToProcess= new Deque<number>()

    /** Returns whether the given [position] has been marked as reachable. */
    isReachable(position: number): Boolean {
        return this.distanceTo[position] !== UNREACHABLE
    }

    /**
     * Returns the distance of the player from the current player position to
     * the passed [targetPosition], or [UNREACHABLE] if the player can't reach the passed [targetPosition].
     */
    getDistance(targetPosition: number): number {
        return this.distanceTo[targetPosition]
    }

    /**
     * Calculates the distance of the player to every reachable position with the player
     * being at the given [playerStartPosition] (default: current player position).
     */
    update(playerStartPosition: number = this.board.playerPosition) {

        this.distanceTo.fill(UNREACHABLE)

        this.distanceTo[playerStartPosition] = 0
        this.positionsToProcess.addLast(playerStartPosition)

        while (this.positionsToProcess.isNotEmpty()) {
            const currentPlayerPosition = this.positionsToProcess.removeFirst()

            const newDistance = this.distanceTo[currentPlayerPosition] + 1

            for(const direction of Directions.DIRECTIONS) {
                const newPlayerPosition = this.board.getNeighborPosition(currentPlayerPosition, direction)

                if (this.board.isAccessible(newPlayerPosition) && this.distanceTo[newPlayerPosition] === UNREACHABLE) {
                    this.distanceTo[newPlayerPosition] = newDistance
                    this.positionsToProcess.addLast(newPlayerPosition)
                }
            }
        }
    }
}