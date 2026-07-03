import {
    type LURD_CHAR, LURD_CHARS,
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

const LURD_SET = new Set<string>(LURD_CHARS)
const PUSH_SET = new Set<string>([PUSH_UP_CHAR, PUSH_DOWN_CHAR, PUSH_LEFT_CHAR, PUSH_RIGHT_CHAR])
const MOVE_SET = new Set<string>([MOVE_UP_CHAR, MOVE_DOWN_CHAR, MOVE_LEFT_CHAR, MOVE_RIGHT_CHAR])

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
        return LURD_SET.has(char)
    }

    /** Returns the direction represented by the given lurd character. */
    static getDirectionFromLURDChar(lurdChar: string): DIRECTION {

        switch (lurdChar) {
            case 'l':
            case 'L': return LEFT
            case 'u':
            case 'U': return UP
            case 'r':
            case 'R': return RIGHT
            case 'd':
            case 'D': return DOWN
        }

        throw new RangeError("Invalid lurdChar given!")
    }

    /**
     * Returns the move char for the passed [direction]
     *
     * Example:
     * If [UP] is passed then 'u' is returned.
     */
    static getMoveCharForDirection(direction: DIRECTION): LURD_CHAR {
        return Directions.lurdMoveCharacters[direction]
    }

    static isPushChar(char: LURD_CHAR): boolean {
        return PUSH_SET.has(char)
    }

    static isMoveChar(char: LURD_CHAR): boolean {
        return MOVE_SET.has(char)
    }

    /**
     * Returns the push char for the passed [direction].
     *
     * Example:
     * If [UP] is passed then 'U' is returned.
     */
    static getPushCharForDirection(direction: DIRECTION): LURD_CHAR {
        return Directions.lurdPushCharacters[direction]
    }
}