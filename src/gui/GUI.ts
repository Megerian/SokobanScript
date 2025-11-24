import { Board } from "../board/Board"
import { NONE, SokobanApp } from "../app/SokobanApp"
import { CommonSkinFormatBase, SKIN_NAME } from "../skins/commonSkinFormat/CommonSkinFormatBase"
import { Settings } from "../app/Settings"
import { Snapshot } from "../Sokoban/domainObjects/Snapshot"
import { PuzzleCollectionIO } from "../services/PuzzleCollectionIO"
import { Collection } from "../Sokoban/domainObjects/Collection"
import { Puzzle } from "../Sokoban/domainObjects/Puzzle"
import {DIRECTION, Directions, DOWN, UP} from "../Sokoban/Directions"
import { NightShift3Skin } from "../skins/commonSkinFormat/NighShift3Skin"
import { SkinLoader } from "../skins/SkinLoader"
import { Solution } from "../Sokoban/domainObjects/Solution"
import { BoardRenderer, SelectionState } from "./BoardRenderer"
import { SnapshotSidebarCallbacks, SnapshotSidebarView } from "./SnapshotSidebarView"
import { LetslogicProgressCallbacks } from "../services/letslogic/LetsLogicService"

export const enum Action {
    puzzleSelected = "puzzleSelected",
    collectionSelected = "collectionSelected",
    toggleSnapshotList = "toggleSnapshotList",
    howToPlay = "howToPlay",
    undoAll = "undoAll",
    undo = "undo",
    redo = "redo",
    redoAll = "redoAll",
    moveLeft = "moveLeft",
    moveRight = "moveRight",
    moveUp = "moveUp",
    moveDown = "moveDown",
    hideWalls = "hideWalls",
    toggleSoundEnabled = "toggleSoundEnabled",
    setBackgroundColor = "setBackgroundColor",
    setDefaultBackgroundColor = "setDefaultBackgroundColor",
    setDropsBackgroundImage = "setDropsBackgroundImage",
    showAnimationsCheckbox = "showAnimationsCheckbox",
    copyMovesAsString = "copyMovesAsString",
    pasteMovesFromClipboard = "pasteMovesFromClipboard",
    importPuzzleFromClipboard = "importPuzzleFromClipboard",
    copyPuzzleToClipboard = "copyPuzzleToClipboard",
    importLURDString = "importLURDString",
    saveSnapshot = "saveSnapshot",
    toggleDeleteSnapshotMode = "toggleDeleteSnapshotMode",
    toggleRuler = "toggleRuler",

    // Puzzle navigation
    nextPuzzle = "nextPuzzle",
    previousPuzzle = "previousPuzzle",

    // Letslogic specific actions
    setLetslogicApiKey = "setLetslogicApiKey",
    submitLetslogicCurrentPuzzleSolutions = "submitLetslogicCurrentPuzzleSolutions",
    submitLetslogicCollectionSolutions   = "submitLetslogicCollectionSolutions",

    cellClicked = "cellClicked",
}

export class GUI {

    // --- Status elements used by SokobanApp ---
    movesText  = document.getElementById("moves")  as HTMLSpanElement
    pushesText = document.getElementById("pushes") as HTMLSpanElement

    /** View menu (skin, animation, etc.) */
    private skinItems                         = document.querySelectorAll("[data-skinName]")
    private graphicSizeSelectorItems          = document.querySelectorAll("[data-skinGraphicSize]")
    private moveAnimationDelayItems           = document.querySelectorAll("[data-moveAnimationDelay]")
    private selectedObjectAnimationDelayItems = document.querySelectorAll("[data-selectedObjectAnimationDelay]")
    private showAnimationsCheckbox            = document.getElementById("showAnimations") as HTMLInputElement

    /** Ruler checkbox (View menu) */
    private showRulerCheckbox                 = document.getElementById("showRuler") as HTMLInputElement

    /** Ruler containers around the board */
    private boardRulerTop  = document.getElementById("boardRulerTop") as HTMLDivElement
    private boardRulerLeft = document.getElementById("boardRulerLeft") as HTMLDivElement

    /** Currently highlighted ruler cells (column + row) */
    private highlightedRulerCol: HTMLElement | null = null
    private highlightedRulerRow: HTMLElement | null = null

    /** Settings menu */

        // Sound
    private soundEnabledCheckbox = document.getElementById("soundEnabled") as HTMLInputElement
    // Background
    private backgroundColor           = document.getElementById("backgroundColor")           as HTMLInputElement
    private setDefaultBackgroundColor = document.getElementById("setDefaultBackgroundColor") as HTMLElement
    private setDropsBackgroundImage   = document.getElementById("setDropsBackgroundImage")   as HTMLElement

    /** Toolbar elements */
    undoAllButton  = document.getElementById("undoAllButton")  as HTMLButtonElement
    undoButton     = document.getElementById("undoButton")     as HTMLButtonElement
    redoButton     = document.getElementById("redoButton")     as HTMLButtonElement
    redoAllButton  = document.getElementById("redoAllButton")  as HTMLButtonElement
    private hideWallsCheckbox         = document.getElementById("hideWalls")                  as HTMLInputElement
    private copyMovesAsString         = document.getElementById("copyMovesAsString")          as HTMLElement
    private pasteMovesFromClipboard   = document.getElementById("pasteMovesFromClipboard")    as HTMLElement
    private importPuzzleFromClipboard = document.getElementById("importPuzzleFromClipboard")  as HTMLElement
    private exportPuzzleFromClipboard = document.getElementById("exportPuzzleFromClipboard")  as HTMLElement
    private importPuzzleFromFile      = document.getElementById("importPuzzleFromFile")       as HTMLDivElement
    private puzzleFileInput           = document.getElementById("puzzleFileInput")            as HTMLInputElement
    private howToPlayMenuItem         = document.getElementById("howToPlay")                  as HTMLInputElement

    /** Letslogic menu */
    private letslogicSetApiKeyItem        = document.getElementById("letslogicSetApiKey")        as HTMLDivElement
    private letslogicSubmitCurrentItem    = document.getElementById("letslogicSubmitCurrent")    as HTMLDivElement
    private letslogicSubmitCollectionItem = document.getElementById("letslogicSubmitCollection") as HTMLDivElement

    /** Letslogic API key modal (for clickable link + input) */
    private letslogicApiKeyModal      = document.getElementById("letslogicApiKeyModal")      as HTMLDivElement | null
    private letslogicApiKeyInput      = document.getElementById("letslogicApiKeyInput")      as HTMLInputElement | null
    private letslogicApiKeySaveButton = document.getElementById("letslogicApiKeySaveButton") as HTMLButtonElement | null

    /**
     * Letslogic progress modal (shows that something is happening during submissions
     * and displays the Letslogic responses and per-puzzle progress).
     *
     * The corresponding HTML elements are expected in index.html:
     *  - #letslogicProgressModal
     *  - #letslogicProgressTitle
     *  - #letslogicProgressStatus
     *  - #letslogicProgressLog
     *  - #letslogicProgressCloseButton
     */
    private letslogicProgressModal       = document.getElementById("letslogicProgressModal")       as HTMLDivElement | null
    private letslogicProgressTitle       = document.getElementById("letslogicProgressTitle")       as HTMLDivElement | null
    private letslogicProgressStatus      = document.getElementById("letslogicProgressStatus")      as HTMLDivElement | null
    private letslogicProgressLog         = document.getElementById("letslogicProgressLog")         as HTMLPreElement | null
    private letslogicProgressCloseButton = document.getElementById("letslogicProgressCloseButton") as HTMLButtonElement | null

    /** Status bar */
    private statusTextLabel = document.getElementById("statusTextLabel") as HTMLLabelElement
    private statusText      = document.getElementById("statusText")      as HTMLSpanElement

    /** Collection and puzzle selectors */
    private collectionSelector = document.getElementById("collectionSelector") as HTMLSelectElement
    private puzzleSelector     = document.getElementById("puzzleSelector")     as HTMLSelectElement
    private puzzleCollection   = new Collection("", "", []) // currently active puzzle collection

    // Imported collections keyed by display name (usually file name without extension).
    private importedCollections = new Map<string, Collection>()

    /** Solutions/Snapshots list + sidebar UI */
    private snapshotList             = document.getElementById("snapshotList")             as HTMLDivElement
    private importLURDStringButton   = document.getElementById("importLURDString")         as HTMLButtonElement
    private saveSnapshotButton       = document.getElementById("saveSnapshotButton")       as HTMLButtonElement
    private deleteSnapshotButton     = document.getElementById("deleteSnapshotButton")     as HTMLButtonElement
    private snapshotSidebar          = document.getElementById("snapshotSidebar")          as HTMLDivElement
    private showSnapshotListCheckbox = document.getElementById("showSnapshotListCheckbox") as HTMLInputElement
    private filterSolutionsButton    = document.getElementById("filterSolutionsButton")    as HTMLButtonElement
    private filterSnapshotsButton    = document.getElementById("filterSnapshotsButton")    as HTMLButtonElement

    private snapshotContextMenu = document.getElementById("snapshotContextMenu") as HTMLDivElement | null

    toolbarButtons = document.getElementById("toolbarButtons") as HTMLDivElement // main container for toolbar and board

    // Canvas / Rendering
    private canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement
    private board = Board.getDummyBoard()
    private skin: CommonSkinFormatBase = new NightShift3Skin()
    private boardRenderer: BoardRenderer

    // Snapshot-/Solution-Sidebar view
    private snapshotSidebarView: SnapshotSidebarView

    // Mouse
    clickedPosition: number = NONE      // board position that was clicked
    clickedXCoordinate: number = -1     // x-coordinate of mouse event
    clickedYCoordinate: number = -1     // y-coordinate of mouse event

    static isModalDialogShown = false   // used to temporarily suppress key handling

    constructor(private readonly app: SokobanApp) {

        this.boardRenderer = new BoardRenderer(this.canvas, this.board, this.skin)

        const sidebarCallbacks: SnapshotSidebarCallbacks = {
            onSetSnapshot:   (snapshot: Snapshot) => this.app.setSnapshot(snapshot),
            onCopySnapshot:  (snapshot: Snapshot) => this.app.copyMovesToClipboard(snapshot.lurd),
            onDeleteSnapshot:(snapshot: Snapshot) => this.app.deleteSnapshot(snapshot),
        }

        this.snapshotSidebarView = new SnapshotSidebarView(
            this.snapshotList,
            this.snapshotSidebar,
            this.deleteSnapshotButton,
            this.filterSolutionsButton,
            this.filterSnapshotsButton,
            this.snapshotContextMenu,
            sidebarCallbacks
        )

        this.addListeners()

        document.body.style.overflow = "hidden" // avoid window scrolling when mouse wheel is used

        this.boardRenderer.adjustCanvasSize()
        this.boardRenderer.adjustNewGraphicSize()
    }

    /** Recalculates canvas and graphic size after sidebar visibility changed. */
    private recalcLayoutAfterSidebarChange = () => {
        this.boardRenderer.adjustCanvasSize()
        this.boardRenderer.adjustNewGraphicSize()
        this.updateCanvas()
    }

    /** Aligns the toolbar width with the actual board width in pixels. */
    private syncToolbarWidthToBoard(): void {
        if (!this.toolbarButtons) {
            return
        }

        const boardWidthPx = this.boardRenderer.getBoardPixelWidth()

        // Only apply if we have a meaningful width
        if (boardWidthPx > 0) {
            this.toolbarButtons.style.width = `${boardWidthPx}px`
        }
    }

    // ------------------------------------------------------------------------
    // Settings / Initial GUI state
    // ------------------------------------------------------------------------

    /** Sets all GUI elements according to the current settings. */
    async setCurrentSettings(): Promise<void> {

        // Skin
        this.skinItems.forEach(item => {
            item.classList.remove("selected", "active")
            if (item.getAttribute("data-skinName") === Settings.skinName) {
                item.classList.add("active", "selected")
            }
        })

        // Skin graphic size
        this.graphicSizeSelectorItems.forEach(item => {
            item.classList.remove("selected", "active")
            if (item.getAttribute("data-skinGraphicSize") === Settings.graphicSize) {
                item.classList.add("active", "selected")
            }
        })

        // Move animation delay
        this.moveAnimationDelayItems.forEach(item => {
            item.classList.remove("selected", "active")
            if (item.getAttribute("data-moveAnimationDelay") === Settings.moveAnimationDelayMs.toString()) {
                item.classList.add("active", "selected")
            }
        })

        // Selected object animation delay
        this.selectedObjectAnimationDelayItems.forEach(item => {
            item.classList.remove("selected", "active")
            if (item.getAttribute("data-selectedObjectAnimationDelay") === Settings.selectedObjectAnimationsSpeedPercent.toString()) {
                item.classList.add("active", "selected")
            }
        })

        this.showAnimationsCheckbox.checked = Settings.showAnimationFlag
        this.hideWallsCheckbox.checked      = Settings.hideWallsFlag
        this.soundEnabledCheckbox.checked   = Settings.soundEnabled
        this.backgroundColor.value          = Settings.backgroundColor

        if (this.showRulerCheckbox) {
            this.showRulerCheckbox.checked = Settings.showRulerFlag
        }

        await this.setSkin(Settings.skinName)

        if (Settings.backgroundImageName.length > 0) {
            GUI.setBackgroundImage(Settings.backgroundImageName)
        } else {
            GUI.setNewBackgroundColor(Settings.backgroundColor)
        }

        // Snapshot list visibility
        this.showSnapshotListCheckbox.checked = Settings.showSnapshotListFlag
        this.setSnapshotListVisible(Settings.showSnapshotListFlag)

        // Canvas & Rendering
        this.boardRenderer.adjustCanvasSize()
        this.boardRenderer.adjustNewGraphicSize()
        this.updateCanvas()
    }

    async setSkin(skinName: SKIN_NAME): Promise<void> {
        this.skin = await SkinLoader.loadSkinByName(skinName)
        Settings.skinName = skinName

        this.boardRenderer.setSkin(this.skin)
        this.boardRenderer.restartAnimations()
        this.updateCanvas()
    }

    /** Called when a new puzzle is loaded in the app. */
    newPuzzleLoaded(): void {
        // Keep a direct reference to the current board of the active puzzle
        this.board = this.app.board

        this.boardRenderer.setBoard(this.board)
        this.boardRenderer.adjustCanvasSize()
        this.boardRenderer.adjustNewGraphicSize()
        this.updateCanvas()
    }

    // ------------------------------------------------------------------------
    // Canvas / Mouse handling
    // ------------------------------------------------------------------------

    private canvasMouseDown(event: MouseEvent): void {
        this.clickedXCoordinate = event.x
        this.clickedYCoordinate = event.y

        this.clickedPosition = this.convertScreenCoordinatesToBoardPosition(event.x, event.y)
        if (this.clickedPosition !== NONE) {
            this.doAction(Action.cellClicked)
        }
    }

    private canvasMouseUp(event: MouseEvent): void {
        // Only treat mouse up as a drag end if mouse moved more than a few pixels
        if (
            Math.abs(event.x - this.clickedXCoordinate) < 5 &&
            Math.abs(event.y - this.clickedYCoordinate) < 5
        ) {
            return
        }

        this.clickedPosition = this.convertScreenCoordinatesToBoardPosition(event.x, event.y)
        if (this.clickedPosition !== NONE) {
            this.doAction(Action.cellClicked)
        }
    }

    /** Mouse is moved over the canvas – highlight corresponding ruler cells. */
    private canvasMouseMove(event: MouseEvent): void {
        const boardPos = this.boardRenderer.screenToBoard(event.clientX, event.clientY)
        if (boardPos == null) {
            this.clearRulerHighlight()
            return
        }

        const col = boardPos % this.board.width
        const row = Math.floor(boardPos / this.board.width)

        this.highlightRulerForCell(col, row)
    }

    /** Highlight one column letter and one row number in the rulers. */
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

        // If rulers are hidden, nothing to highlight
        if (!Settings.showRulerFlag) {
            return
        }

        // Find column cell with matching data-col
        const colEl = this.boardRulerTop.querySelector<HTMLElement>(
            `.board-ruler-cell[data-col="${col}"]`
        )
        if (colEl) {
            colEl.classList.add("board-ruler-highlight")
            this.highlightedRulerCol = colEl
        }

        // Find row cell with matching data-row
        const rowEl = this.boardRulerLeft.querySelector<HTMLElement>(
            `.board-ruler-cell[data-row="${row}"]`
        )
        if (rowEl) {
            rowEl.classList.add("board-ruler-highlight")
            this.highlightedRulerRow = rowEl
        }
    }

    /** Remove any current ruler highlight (called on mouseleave / outside board). */
    private clearRulerHighlight(): void {
        if (this.highlightedRulerCol) {
            this.highlightedRulerCol.classList.remove("board-ruler-highlight")
            this.highlightedRulerCol = null
        }
        if (this.highlightedRulerRow) {
            this.highlightedRulerRow.classList.remove("board-ruler-highlight")
            this.highlightedRulerRow = null
        }
    }

    /**
     * Returns the board position for the given screen (x, y) coordinates
     * or NONE if they do not map to a valid board cell.
     */
    private convertScreenCoordinatesToBoardPosition(x: number, y: number): number {
        const boardPos = this.boardRenderer.screenToBoard(x, y)
        return boardPos != null ? boardPos : NONE
    }

    // ------------------------------------------------------------------------
    // Canvas drawing (delegated to BoardRenderer)
    // ------------------------------------------------------------------------

    updateCanvas(): void {
        const selectionState: SelectionState = {
            selectedBoxPosition: this.app.selectedBoxPosition,
            isPlayerSelected:    this.app.isPlayerSelected
        }

        const playerViewDirection = this.getPlayerViewDirection()
        this.boardRenderer.updateCanvas(selectionState, playerViewDirection)

        // Align toolbar width to board width after each redraw
        this.syncToolbarWidthToBoard()

        // Update rulers (visibility + labels)
        this.updateRulerLayout()
    }

    /**
     * Updates the images on the canvas for all given board positions.
     */
    updateCanvasForPositions(...positions: number[]): void {
        const selectionState: SelectionState = {
            selectedBoxPosition: this.app.selectedBoxPosition,
            isPlayerSelected:    this.app.isPlayerSelected
        }

        const playerViewDirection = this.getPlayerViewDirection()
        this.boardRenderer.updateCanvasForPositions(positions, selectionState, playerViewDirection)
    }

    /**
     * Determines the direction the player should look towards
     * (used by skins that draw the player with facing direction).
     */
    private getPlayerViewDirection(): DIRECTION {
        const lastPlayedMoveDirection = this.app.moveHistory.getLastDoneMoveDirection()

        if (lastPlayedMoveDirection != null) {
            return lastPlayedMoveDirection
        }

        const nextMoveLURDChar = this.app.moveHistory.getNextMoveLURDChar()
        if (nextMoveLURDChar != null) {
            return Directions.getDirectionFromLURDChar(nextMoveLURDChar)
        }

        // As a fallback, try to face any non-wall neighbor
        // for (const direction of Directions.DIRECTIONS) {
        //     const neighborPosition = this.board.getNeighborPosition(this.board.playerPosition, direction)
        //     if (!this.board.isWall(neighborPosition)) {
        //         return direction
        //     }
        // }

        // Prefer downward facing since this way the player looks at the user :-)
        return DOWN
    }

    /** Focus + open the collection selector (Fomantic or native). */
    private focusCollectionSelector(): void {
        if (!this.collectionSelector) return

        // Native focus
        this.collectionSelector.focus()

        // Try to open Fomantic dropdown, if initialized
        const $dropdown = ($("#collectionSelector") as any)
        if (typeof $dropdown.dropdown === "function") {
            try {
                $dropdown.dropdown("show")
            } catch {
                // Ignore if Fomantic is not initialized or throws
            }
        } else {
            // Fallback: try to simulate a click on the native select
            this.collectionSelector.click()
        }
    }

    /** Focus + open the puzzle selector (Fomantic or native). */
    private focusPuzzleSelector(): void {
        if (!this.puzzleSelector) return

        // Native focus
        this.puzzleSelector.focus()

        // Try to open Fomantic dropdown, if initialized
        const $dropdown = ($("#puzzleSelector") as any)
        if (typeof $dropdown.dropdown === "function") {
            try {
                $dropdown.dropdown("show")
            } catch {
                // Ignore if Fomantic is not initialized or throws
            }
        } else {
            // Fallback: try to simulate a click on the native select
            this.puzzleSelector.click()
        }
    }

    // ------------------------------------------------------------------------
    // Status / puzzle solved animation
    // ------------------------------------------------------------------------

    setStatusText(text: string): void  {
        this.statusTextLabel.classList.remove("hidden")
        this.statusText.textContent = text
    }

    showPuzzleSolvedAnimation(): void {
        const solvedDiv = document.getElementById("puzzleSolvedDiv") as HTMLDivElement | null
        if (!solvedDiv) return

        // Center horizontally over the *board* width, not the whole canvas
        const boardWidth = this.boardRenderer.getBoardPixelWidth()
        if (boardWidth > 0) {
            solvedDiv.style.left = `${boardWidth / 2}px`
        }

        solvedDiv.style.visibility = ""
        this.canvas.classList.add("animating", "transition", "tada")
        setTimeout(() => {
            this.canvas.classList.remove("animating", "transition", "tada")
            solvedDiv.style.visibility = "hidden"
        }, 1500)
    }

    // ------------------------------------------------------------------------
    // Event listener setup
    // ------------------------------------------------------------------------

    private addListeners(): void {

        this.addKeyboardListeners()
        this.addCanvasListeners()
        this.addSkinAndAnimationListeners()
        this.addFileImportListeners()
        this.addToolbarAndMenuListeners()
        this.addSnapshotSidebarListeners()
        this.addLetslogicApiKeyModalListeners()
        this.addLetslogicProgressModalListeners()

        window.addEventListener("resize", () => {
            this.boardRenderer.adjustCanvasSize()
            this.boardRenderer.adjustNewGraphicSize()
            this.updateCanvas()
        })
    }

    private addKeyboardListeners(): void {

        document.addEventListener("keydown", (event) => {

            if (event.shiftKey || event.ctrlKey || GUI.isModalDialogShown) {
                return
            }
            // Ignore keys when typing / selecting in form controls
            const target = event.target as HTMLElement | null
            if (target) {
                const tagName = target.tagName
                if (
                    tagName === "INPUT" ||
                    tagName === "TEXTAREA" ||
                    tagName === "SELECT" ||
                    target.isContentEditable
                ) {
                    // Do not handle Sokoban shortcuts when user is in a form control
                    return
                }
            }

            const key = event.key

            // Keyboard shortcuts for selectors
            if (key === "c" || key === "C") {
                event.preventDefault()
                this.focusCollectionSelector()
                return
            }

            if (key === "p" || key === "P") {
                event.preventDefault()
                this.focusPuzzleSelector()
                return
            }
            // ---------------------------------------------

            switch (key) {

                case "ArrowLeft":
                case "a":
                case "j":
                    this.doAction(Action.moveLeft)
                    event.preventDefault()
                    break

                case "ArrowUp":
                case "w":
                case "i":
                    this.doAction(Action.moveUp)
                    event.preventDefault()
                    break

                case "ArrowRight":
                case "d":
                    this.doAction(Action.moveRight)
                    event.preventDefault()
                    break

                case "ArrowDown":
                case "s":
                case "k":
                    this.doAction(Action.moveDown)
                    event.preventDefault()
                    break

                case "y":
                case "r":
                    this.doAction(Action.redo)
                    event.preventDefault()
                    break

                case "z":
                    this.doAction(Action.undo)
                    event.preventDefault()
                    break

                case "v":
                    this.doAction(Action.toggleSnapshotList)
                    event.preventDefault()
                    break

                case "Home":
                    this.doAction(Action.undoAll)
                    event.preventDefault()
                    break

                case "End":
                    this.doAction(Action.redoAll)
                    event.preventDefault()
                    break

                case "Delete":
                    this.doAction(Action.undo)
                    event.preventDefault()
                    break

                case "Insert":
                    this.doAction(Action.redo)
                    event.preventDefault()
                    break

                case "PageDown":
                    this.doAction(Action.nextPuzzle)
                    event.preventDefault()
                    break

                case "PageUp":
                    this.doAction(Action.previousPuzzle)
                    event.preventDefault()
                    break
            }
        })
    }

    private addCanvasListeners(): void {
        this.canvas.addEventListener("mousedown", (event) => this.canvasMouseDown(event))
        this.canvas.addEventListener("mouseup",   (event) => this.canvasMouseUp(event))

        // NEW: highlight ruler while mouse moves over the board
        this.canvas.addEventListener("mousemove", (event) => this.canvasMouseMove(event))
        this.canvas.addEventListener("mouseleave", () => this.clearRulerHighlight())

        // Only scroll when mouse is above canvas
        this.canvas.addEventListener("wheel", (event) => this.mouseScroll(event), {
            passive: false   // important so preventDefault() works
        })
    }

    private addSkinAndAnimationListeners(): void {

        // Skin change
        this.skinItems.forEach(skinItem => {
            skinItem.addEventListener("click", () => {
                this.skinItems.forEach(item => item.classList.remove("selected", "active"))
                skinItem.classList.add("active", "selected")

                const selectedSkinName = skinItem.getAttribute("data-skinName") as SKIN_NAME | null
                if (selectedSkinName != null) {
                    this.setSkin(selectedSkinName).then(() => this.updateCanvas())
                }
            })
        })

        // Graphic size change
        this.graphicSizeSelectorItems.forEach(graphicSizeItem => {
            graphicSizeItem.addEventListener("click", () => {
                this.graphicSizeSelectorItems.forEach(item => item.classList.remove("selected", "active"))
                graphicSizeItem.classList.add("active", "selected")

                const selectedGraphicSize = graphicSizeItem.getAttribute("data-skinGraphicSize")
                if (selectedGraphicSize != null) {
                    this.setNewGraphicSize(selectedGraphicSize)
                }
            })
        })

        // Move animation delay
        this.moveAnimationDelayItems.forEach(moveDelayItem => {
            moveDelayItem.addEventListener("click", () => {
                this.moveAnimationDelayItems.forEach(item => item.classList.remove("selected", "active"))
                moveDelayItem.classList.add("active", "selected")

                const moveAnimationDelay = moveDelayItem.getAttribute("data-moveAnimationDelay")
                if (moveAnimationDelay != null) {
                    Settings.moveAnimationDelayMs = +moveAnimationDelay
                }
            })
        })

        // Selected object animation delay
        this.selectedObjectAnimationDelayItems.forEach(delayItem => {
            delayItem.addEventListener("click", () => {
                this.selectedObjectAnimationDelayItems.forEach(item => item.classList.remove("selected", "active"))
                delayItem.classList.add("active", "selected")

                const animationDelay = delayItem.getAttribute("data-selectedObjectAnimationDelay")
                if (animationDelay != null) {
                    Settings.selectedObjectAnimationsSpeedPercent = +animationDelay
                }
            })
        })
    }

    private addFileImportListeners(): void {
        if (!this.importPuzzleFromFile || !this.puzzleFileInput) {
            return
        }

        this.importPuzzleFromFile.addEventListener("click", () => {
            this.puzzleFileInput.click()
        })

        this.puzzleFileInput.addEventListener("change", async () => {
            const file = this.puzzleFileInput.files && this.puzzleFileInput.files[0]
            if (!file) {
                return
            }

            try {
                const text = await file.text()
                const puzzles = PuzzleCollectionIO.parsePuzzleCollection(text)
                if (!puzzles || puzzles.length === 0) {
                    alert("No Sokoban puzzles were found in the selected file.")
                    return
                }

                const fileName = file.name || "Imported puzzle collection"
                const baseName = fileName.replace(/\.[^/.]+$/, "") // remove extension

                const importedCollection = new Collection(baseName, "", puzzles)
                this.importedCollections.set(baseName, importedCollection)

                // Ensure option exists in selector
                const alreadyExists = Array.from(this.collectionSelector.options)
                    .some(option => option.value === baseName)

                if (!alreadyExists) {
                    const option = document.createElement("option")
                    option.value = baseName
                    option.text  = baseName
                    this.collectionSelector.add(option)
                }

                this.collectionSelector.value = baseName

                this.setCollectionForPlaying(importedCollection)
                this.puzzleSelector.selectedIndex = 0
                this.newPuzzleSelected()
            } catch (error) {
                console.error("Failed to read or parse puzzle file", error)
                alert("Could not read the selected file or parse it as a Sokoban puzzle collection.")
            } finally {
                this.puzzleFileInput.value = ""
            }
        })
    }

    private addToolbarAndMenuListeners(): void {

        // Helpers to shorten code
        const bindClick = (el: HTMLElement | null, action: Action) => {
            if (!el) return
            el.addEventListener("click", () => this.doAction(action))
        }
        const bindChange = (el: HTMLElement | null, action: Action) => {
            if (!el) return
            el.addEventListener("change", () => this.doAction(action))
        }

        bindClick(this.undoAllButton, Action.undoAll)
        bindClick(this.undoButton,    Action.undo)
        bindClick(this.redoButton,    Action.redo)
        bindClick(this.redoAllButton, Action.redoAll)

        bindChange(this.hideWallsCheckbox, Action.hideWalls)
        bindChange(this.soundEnabledCheckbox, Action.toggleSoundEnabled)

        this.backgroundColor.addEventListener("input", () => this.doAction(Action.setBackgroundColor))

        bindClick(this.setDefaultBackgroundColor, Action.setDefaultBackgroundColor)
        bindClick(this.setDropsBackgroundImage,   Action.setDropsBackgroundImage)

        bindChange(this.showAnimationsCheckbox, Action.showAnimationsCheckbox)

        if (this.showRulerCheckbox) {
            bindChange(this.showRulerCheckbox, Action.toggleRuler)
        }

        bindClick(this.copyMovesAsString,         Action.copyMovesAsString)
        bindClick(this.pasteMovesFromClipboard,   Action.pasteMovesFromClipboard)
        bindClick(this.importPuzzleFromClipboard, Action.importPuzzleFromClipboard)
        bindClick(this.exportPuzzleFromClipboard, Action.copyPuzzleToClipboard)

        bindClick(this.howToPlayMenuItem, Action.howToPlay)

        // Letslogic menu
        bindClick(this.letslogicSetApiKeyItem,        Action.setLetslogicApiKey)
        bindClick(this.letslogicSubmitCurrentItem,    Action.submitLetslogicCurrentPuzzleSolutions)
        bindClick(this.letslogicSubmitCollectionItem, Action.submitLetslogicCollectionSolutions)

        // Snapshot-UI specific controls that trigger Actions
        bindClick(this.importLURDStringButton,    Action.importLURDString)
        bindChange(this.showSnapshotListCheckbox, Action.toggleSnapshotList)

        this.collectionSelector.addEventListener("change", () => this.doAction(Action.collectionSelected))
        this.puzzleSelector.addEventListener("change",      () => this.doAction(Action.puzzleSelected))
    }

    private addSnapshotSidebarListeners(): void {
        this.saveSnapshotButton.addEventListener("click", () => this.doAction(Action.saveSnapshot))
    }

    /**
     * Initializes the Letslogic API key modal (clickable link + text input).
     */
    private addLetslogicApiKeyModalListeners(): void {
        if (!this.letslogicApiKeyModal) {
            return
        }

        const $modal = ($("#letslogicApiKeyModal") as any)

        // Configure Fomantic modal
        $modal.modal({
            autofocus: "#letslogicApiKeyInput",
            onShow:   () => { GUI.isModalDialogShown = true },
            onHidden: () => { GUI.isModalDialogShown = false }
        })

        // Save button in the modal
        this.letslogicApiKeySaveButton?.addEventListener("click", () => {
            this.saveLetslogicApiKeyFromModal()
        })

        // Pressing Enter inside the input also saves the key
        this.letslogicApiKeyInput?.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Enter") {
                event.preventDefault()
                this.saveLetslogicApiKeyFromModal()
            }
        })
    }

    /**
     * Initializes the Letslogic progress modal (title, status line, log, close button).
     * The modal is used to show live progress during solution submission.
     */
    private addLetslogicProgressModalListeners(): void {
        if (!this.letslogicProgressModal) {
            return
        }

        const $modal = ($("#letslogicProgressModal") as any)

        // Configure Fomantic modal
        $modal.modal({
            autofocus: false,
            onShow:   () => { GUI.isModalDialogShown = true },
            onHidden: () => { GUI.isModalDialogShown = false }
        })

        // Close button: simply hide the modal
        this.letslogicProgressCloseButton?.addEventListener("click", () => {
            $modal.modal("hide")
        })
    }

    /**
     * Reads the key from the modal input, stores it in Settings and closes the modal.
     */
    private saveLetslogicApiKeyFromModal(): void {
        if (!this.letslogicApiKeyInput) {
            return
        }

        const trimmed = this.letslogicApiKeyInput.value.trim()
        Settings.letslogicApiKey = trimmed

        if (trimmed.length > 0) {
            this.setStatusText("Letslogic API key has been saved.")
        } else {
            this.setStatusText("Letslogic API key has been cleared.")
        }

        ($("#letslogicApiKeyModal") as any).modal("hide")
    }

    // ------------------------------------------------------------------------
    // Graphic size / Canvas size
    // ------------------------------------------------------------------------

    /** Sets a new graphic size for the board display. */
    private setNewGraphicSize(selectedGraphicSize: string): void {
        Settings.graphicSize = selectedGraphicSize
        this.boardRenderer.adjustNewGraphicSize()
        this.boardRenderer.restartAnimations()
        this.updateCanvas()
    }

    private mouseScroll(event: WheelEvent): void {
        if (event.deltaY < 0) {
            this.doAction(Action.redo)
        } else if (event.deltaY > 0) {
            this.doAction(Action.undo)
        }

        event.stopPropagation()
    }

    // ------------------------------------------------------------------------
    // Dialogs / Sidebar
    // ------------------------------------------------------------------------

    /** Shows the "How to play" modal dialog. */
    private showHowToPlay(): void {
        ($("#showHowToPlay") as any).modal({
            onShow:   () => { GUI.isModalDialogShown = true },
            onHidden: () => { GUI.isModalDialogShown = false }
        }).modal("show")
    }

    /** Shows or hides the snapshot list sidebar (Fomantic sidebar). */
    private setSnapshotListVisible(visible: boolean): void {
        const sidebar = ($("#snapshotSidebar") as any)

        // Initialize sidebar behavior
        sidebar.sidebar({
            dimPage: false,
            closable: false,
            onVisible: this.recalcLayoutAfterSidebarChange,
            onHidden: this.recalcLayoutAfterSidebarChange
        })

        if (visible) {
            sidebar.sidebar("show")
        } else {
            sidebar.sidebar("hide")
        }
    }

    /** Toggles the snapshot list visibility and saves the setting. */
    private toggleSnapshotListInternal(): void {
        const newValue = !Settings.showSnapshotListFlag
        Settings.showSnapshotListFlag = newValue
        this.showSnapshotListCheckbox.checked = newValue
        this.setSnapshotListVisible(newValue)

        // Width/layout changed
        this.boardRenderer.adjustCanvasSize()
        this.boardRenderer.adjustNewGraphicSize()
        this.updateCanvas()
    }

    // ------------------------------------------------------------------------
    // Ruler helpers
    // ------------------------------------------------------------------------

    /**
     * Shows or hides the rulers around the board according to Settings.showRulerFlag
     * and rebuilds the labels when visible.
     */
    private updateRulerLayout(): void {
        if (!this.boardRulerTop || !this.boardRulerLeft) {
            return
        }

        const visible = Settings.showRulerFlag

        if (!visible) {
            this.boardRulerTop.style.display  = "none"
            this.boardRulerLeft.style.display = "none"
            return
        }

        this.boardRulerTop.style.display  = ""
        this.boardRulerLeft.style.display = ""

        this.renderRulers()
    }

    /**
     * Rebuilds the column (A, B, C, …) and row (1, 2, 3, …) labels so that they
     * match the current board size and cell pixel size.
     */
    private renderRulers(): void {
        if (!this.board || !this.boardRulerTop || !this.boardRulerLeft) {
            return
        }

        const cols = this.board.width
        const rows = this.board.height

        if (!cols || !rows || cols <= 0 || rows <= 0) {
            this.boardRulerTop.innerHTML  = ""
            this.boardRulerLeft.innerHTML = ""
            return
        }

        const boardWidthPx  = this.boardRenderer.getBoardPixelWidth()
        const boardHeightPx = this.boardRenderer.getBoardPixelHeight()

        const cellWidth  = boardWidthPx  / cols
        const cellHeight = boardHeightPx / rows

        // --- Top ruler: A, B, C, ... ---

        this.boardRulerTop.innerHTML = ""

        for (let x = 0; x < cols; x++) {
            const label = this.getColumnLabel(x)   // A, B, ..., Z, AA, AB, ...
            const cellDiv = document.createElement("div")
            cellDiv.classList.add("board-ruler-cell")
            cellDiv.dataset.col = String(x)             // <-- NEW: column index for highlighting
            cellDiv.style.width = `${cellWidth}px`
            cellDiv.textContent = label
            this.boardRulerTop.appendChild(cellDiv)
        }

        // --- Left ruler: 1, 2, 3, ... ---

        this.boardRulerLeft.innerHTML = ""

        for (let y = 0; y < rows; y++) {
            const cellDiv = document.createElement("div")
            cellDiv.classList.add("board-ruler-cell")
            cellDiv.dataset.row = String(y)             // <-- NEW: row index for highlighting
            cellDiv.style.height = `${cellHeight}px`
            cellDiv.textContent = String(y + 1)
            this.boardRulerLeft.appendChild(cellDiv)
        }
    }

    /**
     * Converts a zero-based column index to a spreadsheet-like label: 0->A, 1->B, …, 25->Z, 26->AA, etc.
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

    /** Updates the background color and clears any background image. */
    private static setNewBackgroundColor(backgroundColor: string): void {
        Settings.backgroundColor = backgroundColor
        Settings.backgroundImageName = ""
        document.body.setAttribute(
            "style",
            `background-color: ${backgroundColor} !important; overflow: hidden;`
        )
    }

    /** Sets a new background image. */
    private static setBackgroundImage(imageFileName: string): void {
        Settings.backgroundImageName = imageFileName
        document.body.setAttribute(
            "style",
            `background-image: url(/resources/backgroundImages/${imageFileName});` +
            "background-size: 100% 100%; overflow: hidden;"
        )
    }

    // ------------------------------------------------------------------------
    // Collections / Puzzles
    // ------------------------------------------------------------------------

    /**
     * Called when the user selects a different collection in the dropdown.
     */
    private newCollectionSelected(): void {

        const puzzleCollectionName = this.collectionSelector.value

        // 1) Check for imported collection (from file)
        const importedCollection = this.importedCollections.get(puzzleCollectionName)
        if (importedCollection) {
            this.setCollectionForPlaying(importedCollection)
            this.newPuzzleSelected()
            return
        }

        // 2) Check for direct user puzzle via URL parameter
        if (puzzleCollectionName.includes("#")) {
            this.setUserPuzzleForPlaying(puzzleCollectionName)
            return
        }

        // 3) Normal collection from resources
        Settings.lastPlayedCollectionName = puzzleCollectionName

        PuzzleCollectionIO.loadPuzzleCollection(`resources/puzzles/${puzzleCollectionName}`)
            .then(puzzleCollection => {
                this.setCollectionForPlaying(puzzleCollection)
                this.newPuzzleSelected()
            })
    }

    /**
     * When the user has passed a puzzle via URL parameter an extra entry is added.
     * This method sets that puzzle as the only entry in a temporary collection.
     */
    private setUserPuzzleForPlaying(boardAsString: string): void {

        const board = Board.createFromString(boardAsString)
        if (typeof board !== "string") {
            const puzzle = new Puzzle(board)
            puzzle.title = "Puzzle 1"
            const collection = new Collection("", "", [puzzle])
            this.setCollectionForPlaying(collection)
            this.newPuzzleSelected()
        }
    }

    /** Replaces the current puzzle collection with the given one and fills the puzzle selector. */
    private setCollectionForPlaying(collection: Collection): void {
        this.puzzleCollection = collection

        // Inform the app about the current collection so it can submit all solutions for it.
        this.app.setCurrentCollection(collection)

        while (this.puzzleSelector.options.length > 0) {
            this.puzzleSelector.options.remove(0)
        }

        for (const puzzle of collection.puzzles) {
            const puzzleItem = document.createElement("option")
            puzzleItem.value     = puzzle.puzzleNumber.toString()
            puzzleItem.innerText = puzzle.puzzleNumber + " - " + puzzle.title
            this.puzzleSelector.appendChild(puzzleItem)
        }
    }

    /** Sets the selected puzzle in the collection as the active puzzle. */
    private newPuzzleSelected(): void {
        const rawValue = this.puzzleSelector.value
        const puzzleNumber = parseInt(rawValue.split(" - ").pop() ?? "1", 10)

        if (Number.isNaN(puzzleNumber) || puzzleNumber <= 0) {
            console.error("Invalid puzzleNumber from puzzleSelector.value:", rawValue)
            return
        }

        const index = puzzleNumber - 1
        const puzzles = this.puzzleCollection.puzzles

        if (!puzzles || index < 0 || index >= puzzles.length) {
            console.error(
                "No puzzle found at index",
                index,
                "puzzleNumber",
                puzzleNumber,
                "puzzles length:",
                puzzles ? puzzles.length : "undefined",
                this.puzzleCollection
            )
            return
        }

        this.app.setPuzzleForPlaying(puzzles[index])
    }

    /** Selects the next puzzle in the current collection, if any. */
    private selectNextPuzzle(): void {
        if (!this.puzzleSelector || this.puzzleSelector.options.length === 0) {
            return
        }

        const currentIndex = this.puzzleSelector.selectedIndex
        const lastIndex    = this.puzzleSelector.options.length - 1

        if (currentIndex < lastIndex) {
            this.puzzleSelector.selectedIndex = currentIndex + 1
            this.newPuzzleSelected()
        }
    }

    /** Selects the previous puzzle in the current collection, if any. */
    private selectPreviousPuzzle(): void {
        if (!this.puzzleSelector || this.puzzleSelector.options.length === 0) {
            return
        }

        const currentIndex = this.puzzleSelector.selectedIndex

        if (currentIndex > 0) {
            this.puzzleSelector.selectedIndex = currentIndex - 1
            this.newPuzzleSelected()
        }
    }

    // ------------------------------------------------------------------------
    // Snapshots / Solutions sidebar (delegated to SnapshotSidebarView)
    // ------------------------------------------------------------------------

    /** Removes all snapshot/solution items from the sidebar list. */
    clearSnapshotList(): void {
        this.snapshotSidebarView.clear()
    }

    /**
     * Rebuilds the sidebar list from ordered solutions and snapshots.
     * The "best" solutions are already placed at the beginning of the
     * solutions array by the caller (SokobanApp).
     */
    renderSnapshotList(
        orderedSolutions: Solution[],
        snapshots: Snapshot[],
        bestByPush: Snapshot | null,
        bestByMove: Snapshot | null
    ): void {
        this.snapshotSidebarView.renderSnapshotList(
            orderedSolutions,
            snapshots,
            bestByPush,
            bestByMove
        )
    }

    // ------------------------------------------------------------------------
    // Letslogic progress integration
    // ------------------------------------------------------------------------

    /**
     * Creates a LetslogicProgressCallbacks implementation that updates the
     * "Letslogic progress" modal in the GUI.
     *
     * SokobanApp can pass the returned callbacks object to LetslogicService so that
     * every submission (single puzzle or full collection) becomes visible to the user.
     *
     * Example usage in SokobanApp:
     *   const progress = this.gui.createLetslogicProgressCallbacks("currentPuzzle")
     *   await this.letslogicService.submitCurrentPuzzle(this.puzzle, progress)
     */
    public createLetslogicProgressCallbacks(
        scope: "currentPuzzle" | "collection"
    ): LetslogicProgressCallbacks {

        const $modal = this.letslogicProgressModal
            ? ($("#letslogicProgressModal") as any)
            : null

        /**
         * Clears all existing log lines from the progress log container.
         */
        const resetLog = () => {
            if (this.letslogicProgressLog) {
                this.letslogicProgressLog.innerHTML = ""
            }
        }

        /**
         * Appends a single line to the progress log container.
         * Lines containing "-> ERROR" (case-insensitive) are rendered in red.
         * Lines containing "-> OK"    (case-insensitive) are rendered in green.
         * All other lines use the default styling.
         */
        const appendLineInternal = (line: string) => {
            if (!this.letslogicProgressLog) return

            const container = this.letslogicProgressLog

            const div = document.createElement("div")
            div.classList.add("letslogic-progress-log-line")

            const normalized = line.toLowerCase()

            if (normalized.includes("-> error")) {
                div.classList.add("error")
            } else if (normalized.includes("-> ok")) {
                div.classList.add("success")
            }

            div.textContent = line

            container.appendChild(div)
            container.scrollTop = container.scrollHeight
        }

        return {
            openModal: (title: string) => {
                if (!this.letslogicProgressModal || !$modal) {
                    // Fallback: if the modal does not exist, only update the status bar
                    this.setStatusText(title)
                    return
                }

                if (this.letslogicProgressTitle) {
                    this.letslogicProgressTitle.textContent = title
                }

                if (this.letslogicProgressStatus) {
                    this.letslogicProgressStatus.textContent = ""
                }

                resetLog()

                $modal.modal("show")
            },

            setStatus: (status: string) => {
                if (this.letslogicProgressStatus) {
                    this.letslogicProgressStatus.textContent = status
                } else {
                    // Fallback to the status bar
                    this.setStatusText(status)
                }
            },

            appendLine: (line: string) => {
                appendLineInternal(line)
            },

            finish: (finalStatus: string) => {
                if (this.letslogicProgressStatus) {
                    this.letslogicProgressStatus.textContent = finalStatus
                } else {
                    this.setStatusText(finalStatus)
                }

                // Do not auto-close the modal; the user can read the log and close it manually.
                appendLineInternal("")
                appendLineInternal(
                    scope === "collection"
                        ? "Collection submission finished."
                        : "Submission finished."
                )
            }
        }
    }

    // ------------------------------------------------------------------------
    // Action dispatch
    // ------------------------------------------------------------------------

    /**
     * Handles an action triggered by the GUI.
     * If this GUI cannot handle the action itself, it forwards it to the app.
     */
    private doAction(action: Action): void {

        switch (action) {
            case Action.hideWalls:
                Settings.hideWallsFlag = this.hideWallsCheckbox.checked
                this.updateCanvas()
                break

            case Action.toggleSoundEnabled:
                Settings.soundEnabled = this.soundEnabledCheckbox.checked
                break

            case Action.setBackgroundColor:
                GUI.setNewBackgroundColor(this.backgroundColor.value)
                break

            case Action.setDefaultBackgroundColor:
                GUI.setNewBackgroundColor(Settings.DEFAULTS.backgroundColor)
                break

            case Action.setDropsBackgroundImage:
                GUI.setBackgroundImage("Drops.jpeg")
                break

            case Action.howToPlay:
                this.showHowToPlay()
                break

            case Action.toggleSnapshotList:
                this.toggleSnapshotListInternal()
                break

            case Action.toggleDeleteSnapshotMode:
                this.snapshotSidebarView.toggleDeleteMode()
                break

            case Action.toggleRuler:
                if (this.showRulerCheckbox) {
                    Settings.showRulerFlag = this.showRulerCheckbox.checked
                }
                this.updateRulerLayout()
                break

            case Action.collectionSelected:
                this.newCollectionSelected()
                break

            case Action.puzzleSelected:
                this.newPuzzleSelected()
                break

            case Action.nextPuzzle:
                this.selectNextPuzzle()
                break

            case Action.previousPuzzle:
                this.selectPreviousPuzzle()
                break

            case Action.showAnimationsCheckbox:
                Settings.showAnimationFlag = this.showAnimationsCheckbox.checked
                this.boardRenderer.restartAnimations()
                this.updateCanvas()
                break

            case Action.setLetslogicApiKey:
                this.promptForLetslogicApiKey()
                break

            default:
                // All other actions (moves, undo/redo, clipboard, snapshots, Letslogic submissions) are handled by the app.
                this.app.doAction(action)
        }
    }

    /**
     * Opens the Letslogic API key modal so the user can enter the key.
     * The modal contains a clickable link to the Letslogic preferences page.
     */
    private promptForLetslogicApiKey(): void {
        if (!this.letslogicApiKeyModal || !this.letslogicApiKeyInput) {
            console.warn("Letslogic API key modal elements not found in the DOM.")
            return
        }

        // Pre-fill with the current value (if any)
        this.letslogicApiKeyInput.value = Settings.letslogicApiKey || "";

        ($("#letslogicApiKeyModal") as any).modal("show")
    }
}
