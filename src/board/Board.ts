import {DIRECTION, Directions, DOWN, LEFT, RIGHT, UP} from "../Sokoban/Directions"
import {Deque} from "../dataStrutures/Deque"
import {
    XSB_PLAYER,
    XSB_PLAYER_ON_GOAL,
    XSB_CHAR,
    XSB_BOX_ON_GOAL,
    XSB_BOX,
    XSB_GOAL,
    XSB_WALL, XSB_FLOOR, XSB_BACKGROUND, PuzzleFormat
} from "../Sokoban/PuzzleFormat"

const NONE = -1

export type REACHABLE_MARKER = 0 | 1 | 2
export const NOT_REACHABLE: REACHABLE_MARKER = 0
export const REACHABLE_PLAYER: REACHABLE_MARKER = 1
export const REACHABLE_BOX: REACHABLE_MARKER = 2

const BOX = 1
const WALL = 1 << 1
const GOAL = 1 << 2
const ACTIVE_POSITION = 1 << 3
const BACKGROUND = 1 << 4
const DEAD_SQUARE = 1 << 5

export class Board {

    static readonly NONE = -1
    private readonly elements: Array<number> = []

    readonly size: number

    playerPosition    = NONE

    boxCount       = 0
    boxOnGoalCount = 0
    goalCount      = 0

    readonly positions: Array<number>

    readonly neighborsOf: Array<Int32Array> // the 4 neighbor positions of a position

    // All board positions the player could reach assuming there are no boxes on the board.
    public readonly activePositions = new Array<number>()

    readonly reachableMarker: Array<REACHABLE_MARKER>

    private constructor(public width: number, public height: number) {
        this.size = width * height
        this.elements.fill(BACKGROUND)

        this.positions = [...Array(this.size).keys()]   // all valid positions on the board

        this.reachableMarker = new Array<REACHABLE_MARKER>()
        this.reachableMarker.fill(NOT_REACHABLE)

        this.neighborsOf = new Array<Int32Array>(this.size)
    }

    /** Returns the XSB_CHAR for the board element at the given `position`. */
    getXSB_Char(position: number): XSB_CHAR {

        if(position === this.playerPosition) {
            return this.isGoal(position) ? XSB_PLAYER_ON_GOAL : XSB_PLAYER
        }

        if(this.isBoxOnGoal(position)) {
            return XSB_BOX_ON_GOAL
        }
        if(this.isBox(position)) {
            return XSB_BOX
        }
        if(this.isGoal(position)) {
            return XSB_GOAL
        }
        if(this.isWall(position)) {
            return XSB_WALL
        }

        return this.isActive(position) ? XSB_FLOOR : XSB_BACKGROUND
    }

    isWall       = (position: number) => (this.elements[position] & WALL) != 0

    isBackground = (position: number) => this.getXSB_Char(position) == XSB_BACKGROUND

    isActive     = (position: number) => (this.elements[position] & ACTIVE_POSITION) != 0

    isGoal       = (position: number) => (this.elements[position] & GOAL) != 0

    isNotGoal    = (position: number)         => !this.isGoal(position)

    isBox        = (position: number) => (this.elements[position] & BOX) != 0

    isBoxOnGoal  = (position: number) => (this.elements[position] & (BOX + GOAL)) == BOX + GOAL

    isBoxOrWall  = (position: number) => (this.elements[position] & (BOX + WALL)) != 0

    setBox       = (position: number)         => this.elements[position] |= BOX

    removeBox    = (position: number)         => this.elements[position] &= ~BOX

    setWall      = (position: number)         =>  this.elements[position] |= WALL

    setGoal = (position: number)      => this.elements[position] |= GOAL

    setDeadSquare   = (position: number)      => this.elements[position] |= DEAD_SQUARE

    isDeadSquare   = (position: number)=> (this.elements[position] & DEAD_SQUARE) != 0

    /** An active position is drawn as floor. */
    private setActivePosition = (position: number) => this.elements[position] |= ACTIVE_POSITION


    /**
     * Returns whether the given position is accessible for the player or a box.
     * This means at the given position there is NO wall NOR box.
     */
    isAccessible(position: number) {
        return (this.elements[position] & (BOX + WALL)) == 0 && this.isActive(position)
    }

    isAccessibleBox(position: number) {
        return (this.elements[position] & (BOX + WALL + DEAD_SQUARE)) == 0
    }

    markPlayerReachable(positions: number[]): void {
        for(const position of positions) {
            this.reachableMarker[position] = REACHABLE_PLAYER
        }
    }

    markBoxReachable(positions: number[]): void {
        for(const position of positions) {
            this.reachableMarker[position] = REACHABLE_BOX
        }
    }

    removeAllReachableMarkers(): void {
        this.reachableMarker.fill(NOT_REACHABLE)
    }

    hasReachableMarkers(): boolean {
        return this.reachableMarker.some( marker => marker != NOT_REACHABLE)
    }

    getNeighborPosition(position: number, direction: DIRECTION): number {
        switch (direction) {
            case UP:    return  position - this.width < 0              ? NONE : position - this.width
            case DOWN:  return  position + this.width >= this.size     ? NONE : position + this.width
            case LEFT:  return (position % this.width) == 0            ? NONE : position - 1
            case RIGHT: return (position % this.width) == this.width-1 ? NONE : position + 1

            default: return position
        }
    }

    getPlayerNeighborPosition(direction: DIRECTION): number {
        return this.getNeighborPosition(this.playerPosition, direction)
    }

    /**
     * Moves a box from the passed [currentPosition] to the [newPosition]
     * if possible and returns whether that push has been successfully performed.
     */
    pushBox(position: number, newPosition: number): boolean {

        if (!this.isBox(position)) {
            console.log("Error: no box at position ${position} to push.")
            return false
        }

        if (position == newPosition) {
            console.log("Current position and new position are identical!")
            return false
        }

        if (!this.isAccessible(newPosition)) {
            console.log("Box isn't pushable. Destination position isn't accessible!")
            return false
        }

        this.removeBox(position)
        this.setBox(newPosition)

        if(this.isGoal(position)) {
            this.boxOnGoalCount--
        }
        if(this.isGoal(newPosition)) {
            this.boxOnGoalCount++
        }

        return true
    }

    isSolved() {
        return this.boxOnGoalCount === this.boxCount
    }

    /**
     * Returns the direction of the move from 'startPosition' to 'endPosition'.
     * If the both positions aren't adjacent, a RangeError is thrown.
     */
    getDirectionOfMove(startPosition: number, endPosition: number): DIRECTION {
        const diff = endPosition - startPosition
        switch (diff) {
            case 1: return RIGHT
            case -1: return LEFT
            case this.width: return DOWN
            case -this.width: return UP
        }

        throw RangeError
    }

    getBoardAsString(): string {

        let boardAsString = ""

        for(const position of this.positions) {

            const boardElement = this.getXSB_Char(position)

            boardAsString += boardElement
            if(Math.floor(position%this.width) == this.width-1) {
                boardAsString += "\n"
            }
        }

        return boardAsString
    }

    /**
     * Parses a board from the given `boardString` and returns the
     * parsed boards. In case the board is invalid an error message
     * is returned.
     *
     * @param boardString  the string to parse
     */
    static createFromString(boardString: string): Board | string {

        const lines = boardString
            .replace(/\r/g, "")
            .split("\n")
            .filter(PuzzleFormat.isValidBoardRow)   // statt .filter(row => row.includes("#"))
        const height = lines.length

        const width = lines.map(line => line.length)
                                   .reduce((a, b) => Math.max(a, b), -Infinity)

        if(width < 3 || height < 3) {
            return "No valid board"
        }

        const board = new Board(width, height)

        for(let y = 0; y < lines.length; y ++) {

            let row = lines[y]

            if(row.length < width) {
                row += " ".repeat(width - row.length)  // ensure all rows have the same length
            }

            for(let x = 0; x < row.length; x += 1) {
                const cell = row[x]

                const position = y * width + x

                switch(cell) {
                    case "#": {
                        board.setWall(position)
                        break
                    }

                    case "$": {
                        board.setBox(position)
                        break
                    }

                    case "*":
                        board.setBox(position)
                        board.setGoal(position)
                        break

                    case " ":
                    case "_":
                    case "-": {
                        board.elements[position] = BACKGROUND   // active positions are determined later
                        break
                    }

                    case ".":
                        board.elements[position] = GOAL
                        break

                    case "@": {
                        board.elements[position] = ACTIVE_POSITION
                        board.playerPosition = position
                        break
                    }

                    case "+":
                        board.elements[position] = GOAL
                        board.playerPosition = position
                        break

                    default: board.elements[position] = BACKGROUND
                }
            }
        }


        if(board.playerPosition == NONE) {
            return "Board does not contain a player!"
        }

        const isBoardValid = this.determineActiveBoardPositions(board)   // get the positions that are not background
        if(!isBoardValid) {
            return "Player can leave the board!"
        }

        // Count the player reachable boxes and goals (assumed the player can walk through boxes).
        for(const position of board.activePositions) {
            if(board.isBoxOnGoal(position)) {
                board.boxCount++
                board.goalCount++
                board.boxOnGoalCount++
            } else if(board.isBox(position)) {
                board.boxCount++
            } else if(board.isGoal(position)) {
                board.goalCount++
            }

            board.setActivePosition(position)
        }

        if(board.boxCount != board.goalCount) {
            return "Number of boxes and goals don't match! boxes: "+board.boxCount +" but goals: "+board.goalCount
        }

        if(board.boxCount == 0) {
            return "There is no box in the puzzle!"
        }

        Board.createNeighborArrays(board)

        Board.markSimpleDeadSquares(board)

        return board
    }

    /** Fills the neighbors array for a quicker access to all 4 neighbors. */
    private static createNeighborArrays(board: Board) {
        for(const position of board.positions) {
            const neighbors = new Int32Array(4)

            for(const direction of Directions.DIRECTIONS) {
                neighbors[direction] = board.getNeighborPosition(position, direction)
            }

            board.neighborsOf[position] = neighbors
        }
    }

    /** Returns a `Board` with no content. This can be used to set an initial value to a variable of type `Board`. */
    static getDummyBoard(): Board {
        return new Board(0, 0)
    }

    /**
     * Determines the positions the player could reach when no boxes were on the board.
     *
     * These positions are the only ones that may change their content during the game
     * since the player can never reach any other position.
     *
     * The positions are stored in `board.activePositions`.
     *
     * @return `true` if the board is valid, or `false` if the player can reach the border of the board.
     */
    private static determineActiveBoardPositions(board: Board): boolean {

        const positionsToProcess = new Deque<number>()
        const isActivePosition = new Array<boolean>(board.size)
        isActivePosition.fill(false)

        // Check which positions are reachable for the player.
        // If the player can reach the border of the board it is invalid.
        // The current player position is the start position.
        positionsToProcess.add(board.playerPosition)
        isActivePosition[board.playerPosition] = true

        board.activePositions.push(board.playerPosition)

        // Determine all reachable positions of the player.
        while (positionsToProcess.isNotEmpty()) {
            const playerPosition = positionsToProcess.removeFirst()

            // If the player has reached the border of the board, the board is invalid.
            if (playerPosition < board.width || playerPosition > board.size - board.width
                || playerPosition % board.width == 0 || playerPosition % board.width == board.width - 1) {
                return false
            }

            for (const direction of Directions.DIRECTIONS) {
                const nextPlayerPosition = board.getNeighborPosition(playerPosition, direction)
                if (!board.isWall(nextPlayerPosition) && !isActivePosition[nextPlayerPosition]) {
                    isActivePosition[nextPlayerPosition] = true
                    board.activePositions.push(nextPlayerPosition)
                    positionsToProcess.add(nextPlayerPosition)
                }
            }
        }

        board.activePositions.sort()

        return true
    }


    private static markSimpleDeadSquares(board: Board) {

        const hasWallOnBothAxes = (position: number) =>
            (board.isWall(board.getNeighborPosition(position, UP)) || board.isWall(board.getNeighborPosition(position, DOWN)))
         && (board.isWall(board.getNeighborPosition(position, LEFT)) || board.isWall(board.getNeighborPosition(position, RIGHT)))

        board.activePositions.filter(board.isNotGoal)
                             .filter(hasWallOnBothAxes)
                             .forEach(board.setDeadSquare)
    }

    clone(): Board {
        return Board.createFromString(this.getBoardAsString()) as Board
    }
}