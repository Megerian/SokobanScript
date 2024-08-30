export const XSB_WALL: XSB_CHAR           = '#'
export const XSB_FLOOR: XSB_CHAR          = ' '
export const XSB_BOX: XSB_CHAR            = '$'
export const XSB_BOX_ON_GOAL: XSB_CHAR    = '*'
export const XSB_PLAYER: XSB_CHAR         = '@'
export const XSB_PLAYER_ON_GOAL: XSB_CHAR = '+'
export const XSB_GOAL: XSB_CHAR           = '.'
export const XSB_BACKGROUND: XSB_CHAR     = '-'

export const PUSH_UP_CHAR: LURD_CHAR    = "U"
export const PUSH_DOWN_CHAR: LURD_CHAR  = "D"
export const PUSH_LEFT_CHAR: LURD_CHAR  = "L"
export const PUSH_RIGHT_CHAR: LURD_CHAR = "R"
export const MOVE_UP_CHAR: LURD_CHAR    = "u"
export const MOVE_DOWN_CHAR: LURD_CHAR  = "d"
export const MOVE_LEFT_CHAR: LURD_CHAR  = "l"
export const MOVE_RIGHT_CHAR: LURD_CHAR = "r"

export type LURD_CHAR = "U" | "D" | "R" | "L" | "u" | "d" | "r" | "l"

export const LURD_CHARS = ["U", "D", "R", "L", "u", "d", "r", "l"]

export type XSB_CHAR = '#' | ' ' | '$' | '*' | '@' | '+' | '.' | '-'
export const XSB_CHARS = ['#', ' ', '$', '*', '@', '+', '.', '-']

export class LevelFormat {

    static isValidBoardRow(boardRow: string): boolean {

        const isInvalidChar = (char: string) => XSB_CHARS.indexOf(char) == -1 && char !== '\r' && char !== '\n'

        for(const char of boardRow) {
            if(isInvalidChar(char)) {
                return false
            }
        }
        return true
    }
}
