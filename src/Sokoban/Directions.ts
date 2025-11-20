import {
    LURD_CHAR, LURD_CHARS,
    MOVE_DOWN_CHAR,
    MOVE_LEFT_CHAR,
    MOVE_RIGHT_CHAR,
    MOVE_UP_CHAR,
    PUSH_DOWN_CHAR, PUSH_LEFT_CHAR, PUSH_RIGHT_CHAR,
    PUSH_UP_CHAR
} from "./PuzzleFormat"

export type DIRECTION = 0 | 1 | 2 | 3

export const UP:    DIRECTION = 0
export const DOWN:  DIRECTION = 1
export const LEFT:  DIRECTION = 2
export const RIGHT: DIRECTION = 3

export class Directions {

    /** LURD characters indexed by direction. */
    private static lurdMoveCharacters = [MOVE_UP_CHAR, MOVE_DOWN_CHAR, MOVE_LEFT_CHAR, MOVE_RIGHT_CHAR]
    private static lurdPushCharacters = [PUSH_UP_CHAR, PUSH_DOWN_CHAR, PUSH_LEFT_CHAR, PUSH_RIGHT_CHAR]

    static DIRECTIONS = [UP, DOWN, LEFT, RIGHT]

    static getOpposite(direction: DIRECTION): DIRECTION {
        switch(direction) {
            case UP: return DOWN
            case DOWN: return UP
            case LEFT: return RIGHT
            case RIGHT: return LEFT
        }
        return UP
    }

    /** Returns whether the given char is a valid lurd character. */
    static isValidDirectionChar(char: string): boolean {
        return LURD_CHARS.indexOf(char) != -1
    }

    /** Returns the direction represented by the given lurd character. */
    static getDirectionFromLURDChar(lurdChar: string): DIRECTION {

        switch (lurdChar.toLowerCase()) {
            case 'l': return LEFT
            case 'u': return UP
            case 'r': return RIGHT
            case 'd': return DOWN
        }

        throw RangeError("Invalid lurdChar given!")
    }

    /**
     * Returns the move char for the passed [direction]
     *
     *    Example:
     *    If [UP] is passed then 'u' is returned.
     */
    static getMoveCharForDirection(direction: DIRECTION): LURD_CHAR {
        return Directions.lurdMoveCharacters[direction]
    }

    static isPushChar(char: LURD_CHAR): boolean {
        return this.lurdPushCharacters.indexOf(char) != -1
    }

    static isMoveChar(char: LURD_CHAR): boolean {
        return this.lurdMoveCharacters.indexOf(char) != -1
    }

    /**
     * Returns the push char for the passed [direction].
     *
     *    Example:
     *    If [UP] is passed then 'U' is returned.
     */
    static getPushCharForDirection(direction: DIRECTION): LURD_CHAR {
        return Directions.lurdPushCharacters[direction]
    }
}
