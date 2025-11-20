import {Utilities} from "./Utilities/Utilities"
import {PuzzleCollectionIO} from "./services/PuzzleCollectionIO"
import {Board} from "./board/Board"
import {Puzzle} from "./Sokoban/domainObjects/Puzzle"
import {Base64URL} from "./services/StringConversions/Base64URL"

/**
 * Parser for parsing the URL parameters for puzzle data.
 */
export class URLParameterParser {

    /**
     * Parses the URL parameters for puzzle data and returns
     * the parsed `Puzzle`.
     */
    static parsePuzzleFromURLParameter(): Puzzle | null {
        return this.getPuzzleByIDURLParameter()     ??   // ?id=4711
               this.getURLEncodedPuzzleFromURL()    ??   // ?puzzle=%23%23%23%23%23%0A%23%40%24.%23%0A%23%23%23%23%23
               this.getBase64EncodedPuzzleFromURL()      // ?base64=IyMjIyMKI0AkLiMKIyMjIyM
    }

    /**
     * When the URL parameter "id" is given try to load the puzzle
     * with that ID from the server.
     */
    private static getPuzzleByIDURLParameter(): Puzzle | null {

        const puzzleID = Utilities.getURLParameter("id")
        if (puzzleID != null) {
            PuzzleCollectionIO.loadPuzzleCollection("resources/puzzles/" + puzzleID + ".sok").then(collection => {
                if (collection.puzzles.length > 0) {
                    return collection.puzzles.pop()!!
                }
            })
        }
        return null
    }

    /**
     * The puzzle (board) can be passed as URL parameter "level" or "puzzle" URL encoded.
     * This method reads the given URl parameter and returns a `Puzzle`
     * object for the parsed board.
     */
    private static getURLEncodedPuzzleFromURL(): Puzzle | null {

        let puzzleBoard = Utilities.getURLParameter("level")
        if (puzzleBoard == null)
            puzzleBoard = Utilities.getURLParameter("puzzle")
        if (puzzleBoard != null) {
            const realPuzzleBoard = decodeURI(puzzleBoard)
            const board = Board.createFromString(realPuzzleBoard)
            if (typeof board !== 'string') {
                return new Puzzle(board)
            }
        }

        return null
    }

    /**
     * The puzzle (board) can be passed as URL parameter "base64" base64URL encoded.
     * This method reads the given URl parameter and returns a `Puzzle`
     * object for the parsed board.
     */
    private static getBase64EncodedPuzzleFromURL(): Puzzle | null {

        const puzzleBoard = Utilities.getURLParameter("base64")
        if (puzzleBoard != null) {
            const realPuzzleBoard = Base64URL.decode(puzzleBoard)

            const board = Board.createFromString(realPuzzleBoard)
            if (typeof board !== 'string') {
                return new Puzzle(board)
            }
        }

        return null
    }
}