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
 * There are two boxes in this puzzle.
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
 *
 *
 * Two optimization strategies are supported:
 *  - moves/pushes:  minimize moves first, then pushes
 *  - pushes/moves:  minimize pushes first, then moves
 *
 * Important notes:
 *  - The algorithm explores states of the form (boxPosition, playerPosition).
 *  - It temporarily assumes that only the currently selected box exists
 *    at a certain position when computing player distances, but it restores
 *    the board state after each step; the board is not modified permanently
 *    by any public method of this class.
 *  - The instance is stateful and not re-entrant – do not call path finding
 *    methods in parallel on the same BoxPathFinding instance.
 */
export class BoxPathFinding {

    /** Helper for computing player distances from a given start position. */
    private readonly playerDistances: PlayerDistances

    /**
     * Priority queues for the two optimization strategies.
     * They share the same underlying comparator logic but differ in weighting
     * moves vs. pushes.
     */
    private readonly openQueueMovesPushes: PriorityQueue<State>
    private readonly openQueuePushesMoves: PriorityQueue<State>

    /** Currently used open queue (depends on optimization strategy). */
    private openQueue: PriorityQueue<State>

    /**
     * Settled states keyed by "boxPosition|playerPosition".
     * For each key we only keep the best-known state according to the
     * active comparator.
     */
    private settledStates = new Map<string, State>()

    /** Currently used comparator (moves/pushes or pushes/moves). */
    private comparator: (a: State, b: State) => number

    constructor(private readonly board: Board) {
        this.playerDistances = new PlayerDistances(this.board)

        // Create priority queues after `this` is fully constructed
        // so we can safely pass instance methods as comparators.
        this.openQueueMovesPushes = new PriorityQueue<State>(this.movesPushesComparator)
        this.openQueuePushesMoves = new PriorityQueue<State>(this.pushesMovesComparator)

        // Default strategy
        this.openQueue = this.openQueueMovesPushes
        this.comparator = this.movesPushesComparator
    }

    // -------------------------------------------------------------------------
    // Comparators
    // -------------------------------------------------------------------------

    /**
     * Comparator that prefers states with fewer moves, then fewer pushes.
     */
    private movesPushesComparator(state1: State, state2: State): number {
        if (state1.moveCount !== state2.moveCount) {
            return state1.moveCount - state2.moveCount
        }
        return state1.pushCount - state2.pushCount
    }

    /**
     * Comparator that prefers states with fewer pushes, then fewer moves.
     */
    private pushesMovesComparator(state1: State, state2: State): number {
        if (state1.pushCount !== state2.pushCount) {
            return state1.pushCount - state2.pushCount
        }
        return state1.moveCount - state2.moveCount
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Computes an optimal path (box positions) from startPosition to targetPosition,
     * optimizing first for moves, then for pushes.
     *
     * The returned path:
     *  - does NOT include the startPosition
     *  - is an array of box positions the box will occupy, in order
     *  - returns null if no path exists
     */
    getBoxPathMovesPushes(startPosition: number, targetPosition: number): number[] | null {
        this.prepareSearchForMovesPushes()
        return this.getBoxPath(startPosition, targetPosition)
    }

    /**
     * Computes an optimal path (box positions) from startPosition to targetPosition,
     * optimizing first for pushes, then for moves.
     *
     * The returned path:
     *  - does NOT include the startPosition
     *  - is an array of box positions the box will occupy, in order
     *  - returns null if no path exists
     *
     * Example:
     *   getBoxPathPushesMoves(1, 3)
     *   => [2, 3]
     */
    getBoxPathPushesMoves(startPosition: number, targetPosition: number): number[] | null {
        this.prepareSearchForPushesMoves()
        return this.getBoxPath(startPosition, targetPosition)
    }

    /**
     * Calculates and returns all positions that are reachable for the box
     * when starting at `boxPosition`, under the constraint that only this box
     * is pushed and other boxes are not moved.
     *
     * Implementation note:
     *  - We run a full search with an “invalid” target index (0). Since no
     *    state will ever have boxPosition === 0 (for a normal board), the
     *    search exhausts the entire reachable state space.
     *  - We then inspect the settled state map to see which box positions
     *    have at least one valid (boxPosition, playerPosition) state.
     */
    getReachableBoxPositions(boxPosition: number): number[] {

        // Run a full search; result path is not used.
        this.getBoxPathPushesMoves(boxPosition, 0)

        const reachablePositions: number[] = []

        for (const position of this.board.activePositions) {
            for (const direction of Directions.DIRECTIONS) {
                // We must check for every possible player neighbor position.
                const playerNeighbor = this.board.getNeighborPosition(position, direction)
                const stateKey = position + "|" + playerNeighbor

                if (this.settledStates.get(stateKey) != null) {
                    reachablePositions.push(position)
                    break
                }
            }
        }

        return reachablePositions
    }

    // -------------------------------------------------------------------------
    // Search initialization
    // -------------------------------------------------------------------------

    /**
     * Prepares internal data structures for a "moves then pushes" search.
     */
    private prepareSearchForMovesPushes(): void {
        this.openQueue = this.openQueueMovesPushes
        this.openQueue.clear()
        this.settledStates.clear()
        this.comparator = this.movesPushesComparator
    }

    /**
     * Prepares internal data structures for a "pushes then moves" search.
     */
    private prepareSearchForPushesMoves(): void {
        this.openQueue = this.openQueuePushesMoves
        this.openQueue.clear()
        this.settledStates.clear()
        this.comparator = this.pushesMovesComparator
    }

    // -------------------------------------------------------------------------
    // Core path search
    // -------------------------------------------------------------------------

    /**
     * Internal helper that runs the search for a path from startPosition
     * to targetPosition using the currently configured queue/comparator.
     *
     * The original board state may contain a real box at startPosition.
     * During the search we temporarily remove that box in some states.
     * To keep the public API side-effect free, we always restore a box
     * at startPosition before returning.
     */
    private getBoxPath(startPosition: number, targetPosition: number): number[] | null {

        const startState = new State(
            startPosition,
            this.board.playerPosition,
            0,
            0,
            null
        )
        this.openQueue.add(startState)

        const lastStateOfPath = this.findPathTo(targetPosition)

        // Restore the original box at the start position.
        this.board.setBox(startPosition)

        return lastStateOfPath ? this.reconstructBoxPathFrom(lastStateOfPath) : null
    }

    /**
     * Searches for a path to the given targetPosition and returns the final
     * state of that path.
     *
     * If no state with boxPosition === targetPosition exists, the search
     * exhausts the open queue and returns null.
     *
     * If called with targetPosition = 0 (or any index that does not occur as
     * a box position in the reachable state space), this effectively performs
     * a full reachability search.
     */
    private findPathTo(targetPosition: number): State | null {
        while (this.openQueue.isNotEmpty()) {
            const currentState = this.openQueue.removeFirst()

            if (currentState.boxPosition === targetPosition) {
                return currentState
            }

            this.generateSuccessorStates(currentState)
        }

        return null
    }

    /** Returns the stored state for the given state key (if any). */
    private getStoredState(state: State): State | undefined {
        return this.settledStates.get(state.keyValue())
    }

    /** Stores or replaces the given state in the settledStates map. */
    private storeState(state: State): void {
        this.settledStates.set(state.keyValue(), state)
    }

    /**
     * Generates all valid successor states from the given currentState and
     * enqueues them into the open queue if they improve upon any previously
     * known state for the same (boxPosition, playerPosition).
     */
    private generateSuccessorStates(currentState: State): void {

        const currentBoxPosition = currentState.boxPosition

        // Compute reachable player positions when the box is at currentBoxPosition.
        // We temporarily place the box, compute distances, then remove it again.
        this.board.setBox(currentBoxPosition)
        this.playerDistances.update(currentState.playerPosition)
        this.board.removeBox(currentBoxPosition)

        const newPushesCount = currentState.pushCount + 1

        for (const direction of Directions.DIRECTIONS) {

            const playerPositionToPushFrom = this.board.getNeighborPosition(
                currentBoxPosition,
                Directions.getOpposite(direction)
            )

            const newBoxPosition = this.board.getNeighborPosition(
                currentBoxPosition,
                direction
            )

            if (!this.isPushPossible(playerPositionToPushFrom, newBoxPosition)) {
                continue
            }

            const distanceToPushFrom = this.playerDistances.getDistance(playerPositionToPushFrom)

            // +1 for the actual push step
            const newMovesCount = currentState.moveCount + distanceToPushFrom + 1

            const newState = new State(
                newBoxPosition,
                currentBoxPosition,
                newMovesCount,
                newPushesCount,
                currentState
            )

            const storedState = this.getStoredState(newState)

            // Enqueue only if this is a new or strictly better state according to the comparator.
            if (storedState === undefined || this.comparator(newState, storedState) < 0) {
                this.storeState(newState)
                this.openQueue.add(newState)
            }
        }
    }

    /**
     * Checks whether a push is possible:
     *  - the player must be able to reach `playerPositionForPush`
     *  - the new box position must be accessible for a box.
     */
    private isPushPossible(playerPositionForPush: number, newBoxPosition: number): boolean {
        return this.playerDistances.isReachable(playerPositionForPush)
            && this.board.isAccessibleBox(newBoxPosition)
    }

    /**
     * Reconstructs the box path (sequence of box positions) from the final
     * state back to the start state.
     *
     * The returned array:
     *  - is in forward order (start -> target)
     *  - does NOT include the starting box position
     */
    private reconstructBoxPathFrom(currentState: State): number[] {
        const boxPath = new Deque<number>()

        let state: State | null = currentState
        while (state != null) {
            boxPath.addFirst(state.boxPosition)
            state = state.previousState
        }

        // The very first element corresponds to the start box position
        // and should not be part of the path.
        boxPath.removeFirst()

        return boxPath.toArray()
    }
}

/**
 * Represents a state in the box path search: the pair (boxPosition, playerPosition)
 * plus accumulated move and push counts and a link to the previous state
 * for path reconstruction.
 */
class State {

    constructor(
        public readonly boxPosition: number,
        public readonly playerPosition: number,
        public moveCount: number,
        public pushCount: number,
        public previousState: State | null
    ) {}

    /**
     * Returns a unique key for this state based on box and player position.
     * This is used as the key in the settledStates map.
     */
    keyValue(): string {
        return this.boxPosition + "|" + this.playerPosition
    }
}