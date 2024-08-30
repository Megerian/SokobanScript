/**
 * Class for calculating the player path from one position to another.
 *
 * @property board  the `Board` to find a player path on
 */
import {Board} from "../../board/Board"
import {Deque} from "../../dataStrutures/Deque"
import {Directions} from "../../Sokoban/Directions"
import {NONE} from "../../app/SokobanApp"


/** Marker for the start position of the player. Used for marking the player start position. */
const START_POSITION_MARKER = -10000

export class PlayerPathFinding {

    private positionsDeque: Deque<number> = new Deque<number>()

    /** DataStorage for saving which position has been reached from which previous position.  */
    private readonly reachedFromPosition: Int16Array

    constructor(private board: Board) {
        this.reachedFromPosition = new Int16Array(board.size)
    }


    /**
     * Returns the positions on the shortest path to get the player
     * to get from the current player position to the passed [targetPosition],
     * excluding the start position.
     *
     * If no path to the target position is found `null` is returned.
     */
    getPathTo(targetPosition: number): Array<number> | null {
        return this.getPath(this.board.playerPosition, targetPosition)
    }

    /**
     * Calculates and returns the reachable positions of the player.
     */
    getReachablePositions(): Array<number> {
        this.getPathTo(0)   // search path to invalid target to mark all reachable positions

        const reachablePositions = new Array<number>()
        for(let position=0; position<this.reachedFromPosition.length; position++) {
            if ((this.reachedFromPosition)[position] != NONE) {
                reachablePositions.push(position)
            }
        }

        return reachablePositions
    }

    /**
     * Returns the positions of the shortest path to get the player
     * from the [startPosition] to the [targetPosition],
     * excluding the [startPosition].
     *
     * If no path to the target position is found `null` is returned.
     */
    getPath(startPosition: number, targetPosition: number):  Array<number> | null {

        if (startPosition == targetPosition) {
            return []
        }

        this.reachedFromPosition.fill(NONE)

        this.reachedFromPosition[startPosition] = START_POSITION_MARKER

        this.positionsDeque.clear()
        this.positionsDeque.addLast(startPosition)

        // Do a breadth first search to find the shortest path to the target position.
        while (this.positionsDeque.isNotEmpty()) {

            const currentPlayerPosition = this.positionsDeque.removeFirst()

            for(const direction of Directions.DIRECTIONS) {
                const newPlayerPosition = this.board.getNeighborPosition(currentPlayerPosition, direction)
                if (!this.board.isBoxOrWall(newPlayerPosition) && this.reachedFromPosition[newPlayerPosition] === NONE) {
                    this.reachedFromPosition[newPlayerPosition] = currentPlayerPosition
                    if (newPlayerPosition == targetPosition) {
                        return this.constructPlayerPath(newPlayerPosition)
                    }
                    this.positionsDeque.addLast(newPlayerPosition)
                }
            }
        }

        return null // No path to the target position found
    }

    /**
     * Returns the player path found by following the trail back from the
     * [endPosition] to the starting position.
     */
    private constructPlayerPath(playerPosition: number): Array<number> {

        this.positionsDeque.clear()

        // We go backwards to reconstruct the path.
        do {
            this.positionsDeque.addFirst(playerPosition)
            playerPosition = this.reachedFromPosition[playerPosition]
        } while (playerPosition != START_POSITION_MARKER)

        this.positionsDeque.removeFirst()  // the start position isn't part of the path
        return this.positionsDeque.toArray()
    }
}