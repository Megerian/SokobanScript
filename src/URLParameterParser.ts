import { Utilities } from "./Utilities/Utilities"
import { PuzzleCollectionIO } from "./services/PuzzleCollectionIO"
import { Board } from "./board/Board"
import { Puzzle } from "./Sokoban/domainObjects/Puzzle"
import { Base64URL } from "./services/StringConversions/Base64URL"

/**
 * Parser for reading puzzle data from URL parameters.
 */
export class URLParameterParser {

    /**
     * Tries to parse a `Puzzle` from the current URL.
     *
     * Supported parameters (checked in this order):
     *   ?id=4711
     *   ?level=...  or  ?puzzle=...        (URL-encoded board string)
     *   ?base64=...                        (Base64URL-encoded board string)
     *   ?json=...                          (Base64URL-encoded JSON with `Board: string[]`)
     */
    static async parsePuzzleFromURLParameter(): Promise<Puzzle | null> {
        // 1. Try to load by ID
        const puzzleById = await this.getPuzzleByIdURLParameter()
        if (puzzleById) {
            return puzzleById
        }

        // 2. Try URL-encoded board (?level= / ?puzzle=)
        const urlEncodedPuzzle = this.getUrlEncodedPuzzleFromURL()
        if (urlEncodedPuzzle) {
            return urlEncodedPuzzle
        }

        // 3. Try Base64 or JSON (?base64= / ?json=)
        const base64OrJsonPuzzle = this.getBase64OrJsonEncodedPuzzleFromURL()
        if (base64OrJsonPuzzle) {
            return base64OrJsonPuzzle
        }

        return null
    }

    /**
     * If the URL parameter "id" is present, tries to load the puzzle
     * collection from the server and returns the last puzzle in it.
     *
     * To keep the API consistent, this method is asynchronous.
     */
    private static async getPuzzleByIdURLParameter(): Promise<Puzzle | null> {
        const puzzleId = Utilities.getURLParameter("id")
        if (!puzzleId) {
            return null
        }

        try {
            const collection = await PuzzleCollectionIO.loadPuzzleCollection(
                `resources/puzzles/${puzzleId}.sok`
            )

            if (collection.puzzles.length === 0) {
                return null
            }

            // Use the last puzzle from the collection
            return collection.puzzles[collection.puzzles.length - 1]
        } catch (error) {
            console.error("Failed to load puzzle collection for id:", puzzleId, error)
            return null
        }
    }

    /**
     * The puzzle (board) can be passed as URL parameter "level" or "puzzle"
     * as a URL-encoded string.
     *
     * Example:
     *   ?level=#####%0A#@$.#%0A#####
     */
    private static getUrlEncodedPuzzleFromURL(): Puzzle | null {
        let puzzleBoard =
            Utilities.getURLParameter("level") ??
            Utilities.getURLParameter("puzzle")

        if (!puzzleBoard) {
            return null
        }

        const boardString = decodeURI(puzzleBoard)
        const board = Board.createFromString(boardString)

        if (typeof board === "string") {
            // `board` is an error message string
            console.error("Invalid board string from URL parameter 'level'/'puzzle':", board)
            return null
        }

        return new Puzzle(board)
    }

    /**
     * The puzzle (board) can be passed as:
     *
     *   - URL parameter "base64" as a Base64URL-encoded plain board string, or
     *   - URL parameter "json" as Base64URL-encoded JSON with a `Board: string[]` field.
     *
     * Examples:
     *
     *   ?base64=BASE64URL("#####\n#@$.#\n#####")
     *
     *   ?json=BASE64URL({
     *     "Board": ["#####", "#@$.#", "#####"],
     *     "Level Set": "Some Set",
     *     "Level Title": "Some Title",
     *     "Level No.": 1
     *   })
     */
    private static getBase64OrJsonEncodedPuzzleFromURL(): Puzzle | null {
        // First prefer "base64", then "json"
        const encoded =
            Utilities.getURLParameter("base64") ??
            Utilities.getURLParameter("json")

        if (!encoded) {
            return null
        }

        // 1. Decode Base64URL → string
        let decoded: string
        try {
            decoded = Base64URL.decode(encoded)
        } catch (error) {
            console.error("Failed to decode Base64URL puzzle string from URL:", error)
            return null
        }

        let boardString: string = decoded
        let meta: any | null = null

        // 2. Try to parse decoded string as JSON (for ?json=...)
        try {
            const json = JSON.parse(decoded)
            if (json && Array.isArray(json.Board)) {
                meta = json
                boardString = json.Board.join("\n")
            }
        } catch {
            // Not JSON: treat `decoded` as plain board string (for ?base64=...)
        }

        // 3. Create Board from boardString
        const board = Board.createFromString(boardString)
        if (typeof board === "string") {
            console.error("Invalid board string from Base64/JSON URL parameter:", board)
            return null
        }

        // 4. Wrap into Puzzle
        const puzzle = new Puzzle(board)

        // 5. Optionally set title from JSON metadata
        if (meta) {
            if (typeof meta["Level Title"] === "string") {
                puzzle.title = meta["Level Title"]
            } else if (typeof meta["Level Set"] === "string") {
                puzzle.title = meta["Level Set"]
            }
            // You could optionally use `meta["Level No."]` as well.
        }

        return puzzle
    }
}
