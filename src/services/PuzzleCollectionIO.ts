import { Board } from "../board/Board"
import { Puzzle } from "../Sokoban/domainObjects/Puzzle"
import { Collection } from "../Sokoban/domainObjects/Collection"
import { LURDVerifier } from "./lurdVerifier/LurdVerifier"
import { Solution } from "../Sokoban/domainObjects/Solution"
import { LURD_CHARS } from "../Sokoban/PuzzleFormat"

export class PuzzleCollectionIO {

    /**
     * Loads a Sokoban puzzle collection file (.sok, .txt, ...) from the given URL
     * and parses it into a Collection of puzzles.
     */
    static async loadPuzzleCollection(collectionFile: string): Promise<Collection> {
        const response = await fetch(collectionFile, {
            method: "GET",
            headers: { "Content-Type": "text/plain; charset=UTF-8" }
        })

        const collectionAsString = await response.text()
        const puzzles = this.parsePuzzleCollection(collectionAsString)

        const collectionTitle = collectionFile.split("/").pop() ?? ""
        return new Collection(collectionTitle, "", puzzles)
    }

    /**
     * Parses a text in classic Sokoban collection format (.sok) into a list of puzzles.
     *
     * A new puzzle starts whenever a valid board can be parsed from a block of
     * consecutive lines containing '#'.
     *
     * All LURD blocks (consecutive lines containing only l,u,r,d,L,U,R,D) that
     * follow belong to the current puzzle until another valid board is found.
     *
     * "ID:" and "Title:" lines that appear while a puzzle is active are stored
     * as `letsLogicID` and `title` of that puzzle.
     */
    static parsePuzzleCollection(collectionAsString: string): Puzzle[] {

        const lines = collectionAsString.replace(/\r/g, "").split(/\n/)

        const collectionPuzzles: Puzzle[] = []
        let currentPuzzle: Puzzle | null = null
        let puzzleNo = 0

        for (let i = 0; i < lines.length; i++) {
            const row = lines[i]

            // --- New puzzle detection: block of board lines (containing '#') ---
            if (row.includes("#")) {

                // Collect consecutive board rows.
                const boardLines: string[] = []
                let j = i
                while (j < lines.length && lines[j].includes("#")) {
                    boardLines.push(lines[j])
                    j++
                }

                const boardString = boardLines.join("\n")
                const board = Board.createFromString(boardString)

                if (typeof board !== "string") {
                    // Valid board -> start a new puzzle.
                    puzzleNo++
                    currentPuzzle = new Puzzle(board)
                    currentPuzzle.puzzleNumber = puzzleNo
                    collectionPuzzles.push(currentPuzzle)
                } else {
                    // Invalid board candidate -> ignore and do not change currentPuzzle.
                    currentPuzzle = currentPuzzle  // explicit for readability
                }

                // Skip the processed board block.
                i = j - 1
                continue
            }

            // From here on we only handle metadata and LURD blocks for the current puzzle.
            if (!currentPuzzle) {
                continue
            }

            // --- ID line: "ID: 107232" ---
            if (row.startsWith("ID:")) {
                const idMatch = row.match(/^ID:\s*(\d+)/)
                if (idMatch) {
                    currentPuzzle.letsLogicID = parseInt(idMatch[1], 10)
                }
                continue
            }

            // --- Title line: "Title: 13-28" ---
            if (row.startsWith("Title:")) {
                currentPuzzle.title = row.substring("Title:".length).trim()
                continue
            }

            // --- LURD block detection ---
            if (this.isLurdLine(row)) {
                const { lurd, nextIndex } = this.readLurdBlock(lines, i)
                i = nextIndex - 1  // skip processed LURD lines

                if (lurd.length === 0) {
                    continue
                }

                const verifier = new LURDVerifier(currentPuzzle.board)
                const verified = verifier.verifyLURD(lurd)

                if (!verified) {
                    // Invalid for this puzzle -> ignore.
                    continue
                }

                if (verified instanceof Solution) {
                    currentPuzzle.addSolution(verified)
                } else {
                    currentPuzzle.addSnapshot(verified)
                }

                continue
            }

            // All other lines (comments, "Best Solution ...", "SaveGame ...", etc.) are ignored.
        }

        return collectionPuzzles
    }

    /** Returns true if the given char is a valid LURD char. */
    private static isLurdChar(char: string): boolean {
        return LURD_CHARS.includes(char)
    }

    /**
     * Returns true if the given line contains ONLY LURD characters
     * (ignoring whitespace).
     */
    private static isLurdLine(line: string): boolean {
        const trimmed = line.trim()
        if (trimmed.length === 0) {
            return false
        }

        for (const c of trimmed) {
            if (!this.isLurdChar(c)) {
                return false
            }
        }
        return true
    }

    /**
     * Reads a multi-line LURD block starting at line index `startIndex`.
     *
     * All consecutive lines that contain ONLY LURD characters (ignoring whitespace)
     * are concatenated. Reading stops when a line is not a pure LURD line.
     *
     * Returns the concatenated LURD string and the index of the first line
     * after the block.
     */
    private static readLurdBlock(lines: string[], startIndex: number): { lurd: string; nextIndex: number } {
        let index = startIndex
        const lurdParts: string[] = []

        while (index < lines.length && this.isLurdLine(lines[index])) {
            lurdParts.push(lines[index].trim())
            index++
        }

        return { lurd: lurdParts.join(""), nextIndex: index }
    }
}
