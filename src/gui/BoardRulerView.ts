// BoardRulerView.ts
//
// UI component responsible for rendering and highlighting the board rulers
// (top: columns A, B, C, …; left: rows 1, 2, 3, …).
//
// Responsibilities:
//  - Show / hide rulers based on Settings.showRulerFlag.
//  - Render labels so that they match the current board dimensions
//    and the current board pixel size.
//  - Highlight the column / row that corresponds to the board cell
//    under the mouse cursor.
//
// This class is purely a view helper and knows nothing about SokobanApp.
// The owning GUI is responsible for:
//  - wiring mouse move events on the canvas and calling highlightForBoardPosition(),
//  - calling updateLayout() whenever the board or the board pixel size changes.
//

import { Board } from "../board/Board"
import { BoardRenderer } from "./BoardRenderer"
import { Settings } from "../app/Settings"

export class BoardRulerView {

    /** Container for the top ruler (columns A, B, C, …). */
    private readonly topContainer: HTMLDivElement

    /** Container for the left ruler (rows 1, 2, 3, …). */
    private readonly leftContainer: HTMLDivElement

    /** Getter for the current board (width/height are read when rendering rulers). */
    private readonly getBoard: () => Board

    /** Used to obtain current board pixel size (for proper cell sizes). */
    private readonly boardRenderer: BoardRenderer

    /** Currently highlighted ruler cells (column + row). */
    private highlightedRulerCol: HTMLElement | null = null
    private highlightedRulerRow: HTMLElement | null = null

    /**
     * @param topContainer   DOM element that holds column labels (top side of board)
     * @param leftContainer  DOM element that holds row labels (left side of board)
     * @param getBoard       function returning the current Board instance
     * @param boardRenderer  renderer used to query board pixel size
     */
    constructor(
        topContainer: HTMLDivElement,
        leftContainer: HTMLDivElement,
        getBoard: () => Board,
        boardRenderer: BoardRenderer
    ) {
        this.topContainer   = topContainer
        this.leftContainer  = leftContainer
        this.getBoard       = getBoard
        this.boardRenderer  = boardRenderer
    }

    // ---------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------

    /**
     * Updates visibility and layout of the rulers.
     *
     * Should be called whenever:
     *  - the board changes (new puzzle / different size),
     *  - the board pixel size changes (resize / graphic size),
     *  - Settings.showRulerFlag changes.
     */
    updateLayout(): void {
        if (!this.topContainer || !this.leftContainer) {
            return
        }

        const visible = Settings.showRulerFlag

        if (!visible) {
            this.topContainer.style.display  = "none"
            this.leftContainer.style.display = "none"
            this.clearHighlight()
            return
        }

        this.topContainer.style.display  = ""
        this.leftContainer.style.display = ""

        this.renderRulers()
    }

    /**
     * Highlights the ruler cells for a given board position,
     * or clears the highlight if the position is null or out of bounds.
     *
     * Intended usage from GUI:
     *   const boardPos = this.boardRenderer.screenToBoard(event.clientX, event.clientY)
     *   this.boardRulerView.highlightForBoardPosition(boardPos)
     */
    highlightForBoardPosition(boardPosition: number | null): void {
        // If rulers are hidden or we do not have a valid board position, clear highlight.
        if (!Settings.showRulerFlag || boardPosition == null) {
            this.clearHighlight()
            return
        }

        const board = this.getBoard()
        const cols  = board.width
        const rows  = board.height

        if (cols <= 0 || rows <= 0) {
            this.clearHighlight()
            return
        }

        const col = boardPosition % cols
        const row = Math.floor(boardPosition / cols)

        if (col < 0 || col >= cols || row < 0 || row >= rows) {
            this.clearHighlight()
            return
        }

        this.highlightRulerForCell(col, row)
    }

    /** Removes any current ruler highlight. */
    clearHighlight(): void {
        if (this.highlightedRulerCol) {
            this.highlightedRulerCol.classList.remove("board-ruler-highlight")
            this.highlightedRulerCol = null
        }
        if (this.highlightedRulerRow) {
            this.highlightedRulerRow.classList.remove("board-ruler-highlight")
            this.highlightedRulerRow = null
        }
    }

    // ---------------------------------------------------------------------
    // Internal rendering
    // ---------------------------------------------------------------------

    /**
     * Rebuilds the column (A, B, C, …) and row (1, 2, 3, …) labels so that they
     * match the current board size and the current board pixel size.
     */
    private renderRulers(): void {
        const board = this.getBoard()
        const cols  = board.width
        const rows  = board.height

        if (!cols || !rows || cols <= 0 || rows <= 0) {
            this.topContainer.innerHTML  = ""
            this.leftContainer.innerHTML = ""
            this.clearHighlight()
            return
        }

        const boardWidthPx  = this.boardRenderer.getBoardPixelWidth()
        const boardHeightPx = this.boardRenderer.getBoardPixelHeight()

        if (boardWidthPx <= 0 || boardHeightPx <= 0) {
            this.topContainer.innerHTML  = ""
            this.leftContainer.innerHTML = ""
            this.clearHighlight()
            return
        }

        const cellWidth  = boardWidthPx  / cols
        const cellHeight = boardHeightPx / rows

        this.renderTopRuler(cols, cellWidth)
        this.renderLeftRuler(rows, cellHeight)

        // Any previous highlighted references are now invalid (DOM rebuilt).
        this.clearHighlight()
    }

    /** Renders the top ruler (columns A, B, C, …). */
    private renderTopRuler(cols: number, cellWidth: number): void {
        this.topContainer.innerHTML = ""

        for (let x = 0; x < cols; x++) {
            const label   = this.getColumnLabel(x)   // A, B, ..., Z, AA, AB, ...
            const cellDiv = document.createElement("div")
            cellDiv.classList.add("board-ruler-cell")
            cellDiv.dataset.col = String(x)
            cellDiv.style.width = `${cellWidth}px`
            cellDiv.textContent = label
            this.topContainer.appendChild(cellDiv)
        }
    }

    /** Renders the left ruler (rows 1, 2, 3, …). */
    private renderLeftRuler(rows: number, cellHeight: number): void {
        this.leftContainer.innerHTML = ""

        for (let y = 0; y < rows; y++) {
            const cellDiv = document.createElement("div")
            cellDiv.classList.add("board-ruler-cell")
            cellDiv.dataset.row = String(y)
            cellDiv.style.height = `${cellHeight}px`
            cellDiv.textContent = String(y + 1)
            this.leftContainer.appendChild(cellDiv)
        }
    }

    /**
     * Highlight one column letter and one row number in the rulers.
     *
     * Assumes that renderRulers() has been called previously and that
     * the number of children matches the current board width/height.
     */
    private highlightRulerForCell(col: number, row: number): void {
        // Remove previous highlight
        if (this.highlightedRulerCol) {
            this.highlightedRulerCol.classList.remove("board-ruler-highlight")
            this.highlightedRulerCol = null
        }
        if (this.highlightedRulerRow) {
            this.highlightedRulerRow.classList.remove("board-ruler-highlight")
            this.highlightedRulerRow = null
        }

        const colElement = this.topContainer.children[col] as HTMLElement | undefined
        if (colElement) {
            colElement.classList.add("board-ruler-highlight")
            this.highlightedRulerCol = colElement
        }

        const rowElement = this.leftContainer.children[row] as HTMLElement | undefined
        if (rowElement) {
            rowElement.classList.add("board-ruler-highlight")
            this.highlightedRulerRow = rowElement
        }
    }

    /**
     * Converts a zero-based column index to a spreadsheet-like label:
     *   0 -> "A", 1 -> "B", …, 25 -> "Z", 26 -> "AA", 27 -> "AB", ...
     */
    private getColumnLabel(index: number): string {
        let n = index
        let label = ""

        while (n >= 0) {
            const remainder = n % 26
            label = String.fromCharCode("A".charCodeAt(0) + remainder) + label
            n = Math.floor(n / 26) - 1
        }

        return label
    }
}