import {Board} from "../../board/Board"
import PriorityQueue from "../../dataStrutures/PriorityQueue"
import {Deque} from "../../dataStrutures/Deque"
import {Directions} from "../../Sokoban/Directions"
import {PlayerDistances} from "../distanceCalculations/PlayerDistances"


/**
 * Class for calculating a path for pushing a box from a start position to a target position.
 * The path is optimized for either pushes/moves or moves/pushes.
 * However: since such a calculation is a very expensive calculation the path for a box
 * is calculating with the constraint that no other box may be pushed in the meantime.
 * Example:
 *
 * #########
 * #---#---#
 * #@$--*-.# <- two boxes. One on a goal, the other to be pushed to the goal.
 * #---#---#
 * #---#---#
 * #-------#
 * #-------#
 * #########
 *
 * There are two boxes in this level.
 * When the user selects the box next to the player to be pushed to the goal on the
 * shortest path (regarding pushes) the best would be to first push the right box one square
 * down, then to push the left box to the goal and then pushing the other box back to its goal.
 *
 * However, this program wouldn't use this path because this requires to push more than one box.
 * Hence, this program would use the path marked with 'o'.
 *
 * #########
 * #---#---#
 * #@$--*-.# <- two boxes. One box on a goal, the other to be pushed to the goal.
 * #-o-#--o#
 * #-o-#--o#
 * #-oooooo#
 * #-------#
 * #########
 */
export class BoxPathFinding {

    private playerDistances: PlayerDistances;

    constructor(private board: Board) {
        this.playerDistances = new PlayerDistances(this.board);
    }

    /**
     * Returns whether the passed state1 is better, equal or worse than state2.
     * regarding first moves, then pushes.
     */
    private movesPushesComparator = (state1: State, state2: State) => {
        if(state1.moveCount !== state2.moveCount) {
            return state1.moveCount - state2.moveCount
        }
        else {
            return state1.pushCount - state2.pushCount
        }
    }

    /**
     * Returns whether the passed state1 is better, equal or worse than state2.
     * regarding first pushes, then moves.
     */
    private pushesMovesComparator = (state1: State, state2: State) => {
        if(state1.pushCount !== state2.pushCount) {
            return state1.pushCount - state2.pushCount
        }
        else {
            return state1.moveCount - state2.moveCount
        }
    }

    private openQueueMovesPushes = new PriorityQueue<State>(this.movesPushesComparator)
    private openQueuePushesMoves = new PriorityQueue<State>(this.pushesMovesComparator)

    private settledStates = new Map<string, State>()
    
    private openQueue: PriorityQueue<State> = this.openQueueMovesPushes
    private comparator = this.movesPushesComparator                     // currently used comparator

    /**
     * Returns the path a box can be pushed along to get from the passed
     * [startPosition] to the passed [targetPosition], or `null` if no such path exists.
     *
     * The returned path does not include the [startPosition].
     *
     * The path is optimal regarding first moves then pushes with the constraints
     * described in this class description.
     */
    getBoxPathMovesPushes(startPosition: number, targetPosition: number): Array<number> | null {

        this.openQueue = this.openQueueMovesPushes
        this.openQueue.clear()
        this.settledStates.clear()
        this.comparator = this.movesPushesComparator

        return this.getBoxPath(startPosition, targetPosition)
    }


    /**
     * Returns the path a box can be pushed along to get from the passed
     * [startPosition] to the passed [targetPosition], or `null` if no such path exists.
     *
     * The returned path does not include the [startPosition].
     *
     * The path is optimal regarding first pushes then moves with the constraints
     * described in this class description.
     *
     * Example:
     *    getBoxPathPushesMoves(1,3)
     *    returns: [2,3]
     */
    getBoxPathPushesMoves(startPosition: number, targetPosition: number): Array<number> | null {
        this.openQueue = this.openQueuePushesMoves
        this.openQueue.clear()
        this.settledStates.clear()
        this.comparator = this.pushesMovesComparator

        return this.getBoxPath(startPosition, targetPosition)
    }

    private getBoxPath(startPosition: number, targetPosition: number): Array<number> | null {

        const startState = new State(startPosition, this.board.playerPosition, 0, 0, null)
        this.openQueue.add(startState)

        const lastStateOfPath = this.findPathTo(targetPosition)

        this.board.setBox(startPosition)     // the algorithm has removed the box while pushing -> set it back

        return lastStateOfPath ? this.reconstructBoxPathFrom(lastStateOfPath) : null
    }

    /**
     * Calculates and returns the currently reachable positions
     * for the box located at the given `boxPosition`.
     * @param boxPosition
     */
    getReachableBoxPositions(boxPosition: number): Array<number> {

        this.getBoxPathPushesMoves(boxPosition, 0)  // Calculate a path to an invalid target visits all reachable positions

        const reachablePositions = new Array<number>()
        for(const position of this.board.activePositions) {
            for(let direction of Directions.DIRECTIONS) {               // we have to check for every player neighbor position
                const stateKey = position + "|" + this.board.getNeighborPosition(position, direction)
                if (this.settledStates.get(stateKey) != null) {
                    reachablePositions.push(position)
                }
            }
        }

        return reachablePositions
    }

    /**
     * Searches for a path of the box to the [targetPosition] and returns the
     * last `State` on that path or `null` if no such path has been found.
     */
    private findPathTo(targetPosition: number): State | null {
        while (this.openQueue.isNotEmpty()) {
            const currentState = this.openQueue.removeFirst()

            if (currentState.boxPosition == targetPosition) return currentState

            this.generateSuccessorStates(currentState)
        }

        return null     // no path to target position found
    }

    getStoredState(state: State): State | undefined {
        return this.settledStates.get(state.keyValue())
    }

    storeState(state: State): void {
        this.settledStates.set(state.keyValue(), state)
    }

    private generateSuccessorStates(currentState: State) {

            const currentBoxPosition = currentState.boxPosition

            // Mark the player reachable positions having the box at the current box position:
            this.board.setBox(currentBoxPosition)
            this.playerDistances.update(currentState.playerPosition)
            this.board.removeBox(currentBoxPosition)

            const newPushesCount = currentState.pushCount + 1

            for(const direction of Directions.DIRECTIONS) {
                const playerPositionToPushFrom = this.board.getNeighborPosition(currentBoxPosition, Directions.getOpposite(direction))
                const newBoxPosition   = this.board.getNeighborPosition(currentBoxPosition, direction)

                if(this.isPushPossible(playerPositionToPushFrom, newBoxPosition)) {
                   const newMovesCount  = currentState.moveCount + this.playerDistances.getDistance(playerPositionToPushFrom) + 1
                   const newState = new State(newBoxPosition, currentBoxPosition, newMovesCount, newPushesCount, currentState)

                   const storedState = this.settledStates.get(newState.keyValue())
                   if(storedState === undefined || this.comparator(newState, storedState) < 0) {
                       this.storeState(newState)
                       this.openQueue.add(newState)
                   }
                }
            }
        }

    private isPushPossible(playerPositionForPush: number, newBoxPosition: number) {
        return this.playerDistances.isReachable(playerPositionForPush) && this.board.isAccessibleBox(newBoxPosition)
    }

    /**
     * Returns the positions the box has been pushed along to reach [currentState]
     * in ascending order.
     */
    private reconstructBoxPathFrom(currentState: State): Array<number> {

        const boxPath = new Deque<number>()

        let state: State | null = currentState
        while(state != null) {
            boxPath.addFirst(state.boxPosition)
            state = state.previousState
        }

        boxPath.removeFirst()  // the start state should not be part of the path

        return boxPath.toArray()
    }
}

class State {
    constructor(public readonly boxPosition: number,
                public readonly playerPosition: number,
                public moveCount: number,
                public pushCount: number,
                public previousState: State | null) {}
    keyValue() {
        return this.boxPosition + "|" + this.playerPosition
    }
}