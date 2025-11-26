import { Board } from "../board/Board"
import { Puzzle } from "../Sokoban/domainObjects/Puzzle"
import { Collection } from "../Sokoban/domainObjects/Collection"
import { LURDVerifier } from "./lurdVerifier/LurdVerifier"
import { Solution } from "../Sokoban/domainObjects/Solution"
import { LURD_CHARS, PuzzleFormat } from "../Sokoban/PuzzleFormat"

/**
 * Internal representation of a "raw" puzzle block as parsed from text.
 * It contains only textual data (board rows, metadata, LURD blocks),
 * without already constructing Board or Puzzle instances.
 */
type RawPuzzleBlock = {
    boardRows: string[]
    title?: string
    letslogicId?: number
    lurdBlocks: string[]
}

/**
 * Utility class for loading and parsing Sokoban puzzle collections and
 * single puzzles (including metadata and optional LURD blocks).
 */
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
     * Behavior:
     *  - Each block of contiguous valid board rows (as detected by PuzzleFormat.isValidBoardRow)
     *    starts a new puzzle.
     *  - "ID:" and "Title:" lines that appear after a board block belong to the current puzzle.
     *  - LURD blocks (consecutive lines containing only L/U/R/D chars) belong to the current puzzle
     *    and are verified against the puzzle's board. Valid LURDs are stored as Solution or Snapshot.
     *  - Comments and all other lines are ignored.
     */
    static parsePuzzleCollection(collectionAsString: string): Puzzle[] {

        const rawBlocks = this.parseRawPuzzleBlocks(collectionAsString)
        const puzzles: Puzzle[] = []

        let puzzleNo = 0

        for (const raw of rawBlocks) {
            const boardString = raw.boardRows.join("\n")
            const board = Board.createFromString(boardString)

            // Board.createFromString returns either a Board or an error string
            if (typeof board === "string") {
                // Invalid board → skip this block completely.
                continue
            }

            puzzleNo++
            const puzzle = new Puzzle(board)
            puzzle.puzzleNumber = puzzleNo
            puzzle.title        = raw.title ?? ""

            if (raw.letslogicId != null) {
                puzzle.letsLogicID = raw.letslogicId
            }

            // Verify and attach LURD blocks as solutions/snapshots
            if (raw.lurdBlocks.length > 0) {
                const verifier = new LURDVerifier(puzzle.board)

                for (const lurd of raw.lurdBlocks) {
                    const verified = verifier.verifyLURD(lurd)
                    if (!verified) {
                        // Not valid for this puzzle → ignore
                        continue
                    }

                    if (verified instanceof Solution) {
                        puzzle.addSolution(verified)
                    } else {
                        puzzle.addSnapshot(verified)
                    }
                }
            }

            puzzles.push(puzzle)
        }

        return puzzles
    }

    /**
     * Parses a single puzzle (board plus optional metadata and optional LURD blocks)
     * from a raw text string.
     *
     * The input may contain:
     *  - one or more board rows (detected via PuzzleFormat.isValidBoardRow)
     *  - an optional "ID: <number>" line (LetsLogic puzzle ID)
     *  - an optional "Title: <text>" line
     *  - optional LURD blocks (consecutive lines of pure L/U/R/D chars)
     *  - arbitrary other comment lines, which are ignored
     *
     * Behavior:
     *  - Uses the same low-level parsing logic as the collection parser
     *    (via parseRawPuzzleBlocks) and then takes the first parsed block.
     *  - On success, a fully initialized Puzzle instance is returned.
     *  - On failure, a human-readable error message (string) is returned.
     */
    static parseSinglePuzzleWithMetadata(rawPuzzleString: string): Puzzle | string {

        const rawBlocks = this.parseRawPuzzleBlocks(rawPuzzleString)

        if (rawBlocks.length === 0) {
            return "No valid Sokoban board rows found in the provided text."
        }

        // For a single puzzle we only look at the first parsed block.
        const first = rawBlocks[0]

        const boardAsString = first.boardRows.join("\n")
        const board = Board.createFromString(boardAsString)

        // Board.createFromString returns either a Board instance or an error string
        if (typeof board === "string") {
            // Propagate the human-readable error message
            return board
        }

        const puzzle = new Puzzle(board)
        puzzle.title = first.title ?? "Imported puzzle"

        if (first.letslogicId != null) {
            puzzle.letsLogicID = first.letslogicId
        }

        // Optional: also interpret LURD blocks for single-puzzle imports
        if (first.lurdBlocks.length > 0) {
            const verifier = new LURDVerifier(puzzle.board)

            for (const lurd of first.lurdBlocks) {
                const verified = verifier.verifyLURD(lurd)
                if (!verified) {
                    continue
                }

                if (verified instanceof Solution) {
                    puzzle.addSolution(verified)
                } else {
                    puzzle.addSnapshot(verified)
                }
            }
        }

        return puzzle
    }

    // ---------------------------------------------------------------------
    // Shared low-level parsing helpers
    // ---------------------------------------------------------------------

    /**
     * Parses the input text into "raw puzzle blocks":
     *  - Each block corresponds to one puzzle candidate.
     *  - A block starts with a contiguous sequence of valid board rows.
     *  - Subsequent "ID:" and "Title:" lines are attached to the same block.
     *  - Subsequent LURD blocks are attached to the same block.
     *
     * It does NOT construct Board or Puzzle instances. That is done by the
     * higher-level methods, which can also decide how to deal with invalid boards.
     */
    private static parseRawPuzzleBlocks(text: string): RawPuzzleBlock[] {
        const lines = text.replace(/\r/g, "").split(/\n/)
        const blocks: RawPuzzleBlock[] = []

        let current: RawPuzzleBlock | null = null

        for (let i = 0; i < lines.length; i++) {
            const row = lines[i]

            // --- New board: start a new raw puzzle block ---
            if (PuzzleFormat.isValidBoardRow(row)) {

                // Collect contiguous board rows for this puzzle
                const boardLines: string[] = []
                let j = i
                while (j < lines.length && PuzzleFormat.isValidBoardRow(lines[j])) {
                    boardLines.push(lines[j])
                    j++
                }

                const block: RawPuzzleBlock = {
                    boardRows: boardLines,
                    lurdBlocks: []
                }

                blocks.push(block)
                current = block

                // Skip processed board lines
                i = j - 1
                continue
            }

            // If we have not yet encountered any valid board, ignore all lines.
            if (!current) {
                continue
            }

            const trimmed = row.trimStart()

            // --- ID line: "ID: 107232" ---
            if (trimmed.startsWith("ID:")) {
                const idMatch = trimmed.match(/^ID:\s*(\d+)/)
                if (idMatch) {
                    current.letslogicId = parseInt(idMatch[1], 10)
                }
                continue
            }

            // --- Title line: "Title: 13-28" ---
            if (trimmed.startsWith("Title:")) {
                current.title = trimmed.substring("Title:".length).trim()
                continue
            }

            // --- LURD block detection ---
            if (this.isLurdLine(row)) {
                const { lurd, nextIndex } = this.readLurdBlock(lines, i)
                i = nextIndex - 1

                if (lurd.length > 0) {
                    current.lurdBlocks.push(lurd)
                }
                continue
            }

            // All other lines (comments, "Best Solution ...", "SaveGame ...", etc.) are ignored.
        }

        // Filter out any blocks that ended up without board rows (should not normally happen).
        return blocks.filter(b => b.boardRows.length > 0)
    }

    /** Returns true if the given char is a valid LURD char. */
    private static isLurdChar(char: string): boolean {
        return LURD_CHARS.includes(char)
    }

    /**
     * Returns true if the given line contains ONLY LURD characters
     * (ignoring surrounding whitespace).
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
     * Returns:
     *  - `lurd`: concatenated LURD string
     *  - `nextIndex`: index of the first line after the LURD block
     */
    private static readLurdBlock(
        lines: string[],
        startIndex: number
    ): { lurd: string; nextIndex: number } {
        let index = startIndex
        const lurdParts: string[] = []

        while (index < lines.length && this.isLurdLine(lines[index])) {
            lurdParts.push(lines[index].trim())
            index++
        }

        return { lurd: lurdParts.join(""), nextIndex: index }
    }
}
