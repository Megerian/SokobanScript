// GUI.ts
//
// High-level UI orchestration for the Sokoban application.
// Responsible for:
//  - Wiring DOM elements (menus, toolbar, canvas, sidebars) to application actions.
//  - Delegating board rendering to BoardRenderer.
//  - Delegating keyboard handling to KeyboardController via UiActions.
//  - Delegating ruler rendering/highlighting to BoardRulerView.
//  - Coordinating snapshot sidebar and Letslogic integration.

import { Board } from "../board/Board"
import { NONE, SokobanApp } from "../app/SokobanApp"
import { CommonSkinFormatBase, SKIN_NAME } from "../skins/commonSkinFormat/CommonSkinFormatBase"
import { Settings } from "../app/Settings"
import { Snapshot } from "../Sokoban/domainObjects/Snapshot"
import { PuzzleCollectionIO } from "../services/PuzzleCollectionIO"
import { Collection } from "../Sokoban/domainObjects/Collection"
import { Puzzle } from "../Sokoban/domainObjects/Puzzle"
import { DIRECTION, Directions, DOWN } from "../Sokoban/Directions"
import { NightShift3Skin } from "../skins/commonSkinFormat/NighShift3Skin"
import { SkinLoader } from "../skins/SkinLoader"
import { Solution } from "../Sokoban/domainObjects/Solution"
import { BoardRenderer, SelectionState } from "./BoardRenderer"
import { SnapshotSidebarCallbacks, SnapshotSidebarView } from "./SnapshotSidebarView"
import { LetslogicProgressCallbacks } from "../services/letslogic/LetsLogicService"
import { KeyboardController } from "./KeyboardController"
import { BoardRulerView } from "./BoardRulerView"
import { Action } from "./Actions"
import { LetsLogicClient, LetsLogicLevel, LetsLogicLevelCollection } from "../services/letslogic/LetsLogicClient"
import { DataStorage, StoredLetslogicCollectionDTO } from "../storage/DataStorage"

export class GUI {

    // ---------------------------------------------------------------------
    // Status elements used by SokobanApp
    // ---------------------------------------------------------------------

    readonly movesText  = document.getElementById("moves")  as HTMLSpanElement
    readonly pushesText = document.getElementById("pushes") as HTMLSpanElement

    // ---------------------------------------------------------------------
    // View menu (skin, animation, ruler)
    // ---------------------------------------------------------------------

    private readonly skinItems                         = document.querySelectorAll<HTMLElement>("[data-skinName]")
    private readonly graphicSizeSelectorItems          = document.querySelectorAll<HTMLElement>("[data-skinGraphicSize]")
    private readonly moveAnimationDelayItems           = document.querySelectorAll<HTMLElement>("[data-moveAnimationDelay]")
    private readonly selectedObjectAnimationDelayItems = document.querySelectorAll<HTMLElement>("[data-selectedObjectAnimationDelay]")
    private readonly showAnimationsCheckbox            = document.getElementById("showAnimations") as HTMLInputElement

    /** Ruler checkbox (View menu) */
    private readonly showRulerCheckbox = document.getElementById("showRuler") as HTMLInputElement | null

    /** Ruler containers around the board */
    private readonly boardRulerTop  = document.getElementById("boardRulerTop") as HTMLDivElement
    private readonly boardRulerLeft = document.getElementById("boardRulerLeft") as HTMLDivElement

    // ---------------------------------------------------------------------
    // Settings menu
    // ---------------------------------------------------------------------

    // Sound
    private readonly soundEnabledCheckbox = document.getElementById("soundEnabled") as HTMLInputElement

    // Background
    private readonly backgroundColor           = document.getElementById("backgroundColor")           as HTMLInputElement
    private readonly setDefaultBackgroundColor = document.getElementById("setDefaultBackgroundColor") as HTMLElement
    private readonly setDropsBackgroundImage   = document.getElementById("setDropsBackgroundImage")   as HTMLElement

    // ---------------------------------------------------------------------
    // Toolbar elements
    // ---------------------------------------------------------------------

    readonly undoAllButton  = document.getElementById("undoAllButton")  as HTMLButtonElement
    readonly undoButton     = document.getElementById("undoButton")     as HTMLButtonElement
    readonly redoButton     = document.getElementById("redoButton")     as HTMLButtonElement
    readonly redoAllButton  = document.getElementById("redoAllButton")  as HTMLButtonElement

    private readonly hideWallsCheckbox         = document.getElementById("hideWalls")                 as HTMLInputElement
    private readonly copyMovesAsString         = document.getElementById("copyMovesAsString")         as HTMLElement
    private readonly pasteMovesFromClipboard   = document.getElementById("pasteMovesFromClipboard")   as HTMLElement
    private readonly importPuzzleFromClipboard = document.getElementById("importPuzzleFromClipboard") as HTMLElement
    private readonly exportPuzzleFromClipboard = document.getElementById("exportPuzzleFromClipboard") as HTMLElement
    private readonly importPuzzleFromFile      = document.getElementById("importPuzzleFromFile")      as HTMLDivElement | null
    private readonly puzzleFileInput           = document.getElementById("puzzleFileInput")           as HTMLInputElement | null
    private readonly howToPlayMenuItem         = document.getElementById("howToPlay")                 as HTMLElement | null

    // ---------------------------------------------------------------------
    // Letslogic menu & dialogs
    // ---------------------------------------------------------------------

    private readonly letslogicSetApiKeyItem        = document.getElementById("letslogicSetApiKey")        as HTMLDivElement | null
    private readonly letslogicSubmitCurrentItem    = document.getElementById("letslogicSubmitCurrent")    as HTMLDivElement | null
    private readonly letslogicSubmitCollectionItem = document.getElementById("letslogicSubmitCollection") as HTMLDivElement | null
    private readonly letslogicImportCollectionsItem = document.getElementById("letslogicImportCollections") as HTMLDivElement | null

    /** Letslogic API key modal (for clickable link + input) */
    private readonly letslogicApiKeyModal      = document.getElementById("letslogicApiKeyModal")      as HTMLDivElement | null
    private readonly letslogicApiKeyInput      = document.getElementById("letslogicApiKeyInput")      as HTMLInputElement | null
    private readonly letslogicApiKeySaveButton = document.getElementById("letslogicApiKeySaveButton") as HTMLButtonElement | null

    /** Letslogic collections modal */
    private readonly letslogicCollectionsModal          = document.getElementById("letslogicCollectionsModal")          as HTMLDivElement | null
    private readonly letslogicCollectionsList           = document.getElementById("letslogicCollectionsList")           as HTMLDivElement | null
    private readonly letslogicCollectionsStatus         = document.getElementById("letslogicCollectionsStatus")         as HTMLDivElement | null
    private readonly letslogicFetchCollectionsButton    = document.getElementById("letslogicFetchCollectionsButton")    as HTMLButtonElement | null
    private readonly letslogicSelectAllCollections      = document.getElementById("letslogicSelectAllCollections")      as HTMLInputElement | null
    private readonly letslogicImportCollectionsConfirm  = document.getElementById("letslogicImportCollectionsConfirm")  as HTMLButtonElement | null

    // ---------------------------------------------------------------------
    // Database menu & stats
    // ---------------------------------------------------------------------

    private readonly databaseBoardsCount    = document.getElementById("databaseBoardsCount")    as HTMLSpanElement | null
    private readonly databaseSolutionsCount = document.getElementById("databaseSolutionsCount") as HTMLSpanElement | null
    private readonly databaseSnapshotsCount = document.getElementById("databaseSnapshotsCount") as HTMLSpanElement | null

    private readonly databaseExportItem = document.getElementById("databaseExport") as HTMLDivElement | null
    /** Database menu (for auto-refresh on open) */
    private readonly databaseMenu = document.getElementById("databaseMenu") as HTMLDivElement | null

    // ---------------------------------------------------------------------
    // Letslogic progress modal
    // ---------------------------------------------------------------------

    private readonly letslogicProgressModal       = document.getElementById("letslogicProgressModal")       as HTMLDivElement | null
    private readonly letslogicProgressTitle       = document.getElementById("letslogicProgressTitle")       as HTMLDivElement | null
    private readonly letslogicProgressStatus      = document.getElementById("letslogicProgressStatus")      as HTMLDivElement | null
    private readonly letslogicProgressLog         = document.getElementById("letslogicProgressLog")         as HTMLPreElement | null
    private readonly letslogicProgressCloseButton = document.getElementById("letslogicProgressCloseButton") as HTMLButtonElement | null

    // ---------------------------------------------------------------------
    // Status bar
    // ---------------------------------------------------------------------

    private readonly statusTextLabel = document.getElementById("statusTextLabel") as HTMLLabelElement
    private readonly statusText      = document.getElementById("statusText")      as HTMLSpanElement

    // ---------------------------------------------------------------------
    // Collection and puzzle selectors
    // ---------------------------------------------------------------------

    private readonly collectionSelector = document.getElementById("collectionSelector") as HTMLSelectElement
    private readonly puzzleSelector     = document.getElementById("puzzleSelector")     as HTMLSelectElement

    /** Currently active puzzle collection. */
    private puzzleCollection = new Collection("", "", [])

    /** Imported collections keyed by display name (usually file name without extension). */
    private readonly importedCollections = new Map<string, Collection>()

    /**
     * Metadata of Letslogic collections fetched in the modal, keyed by their Letslogic id.
     * Used to name imported collections with the actual collection title (and author),
     * instead of guessing it from the first level title.
     */
    private readonly letslogicCollectionsById = new Map<number, LetsLogicLevelCollection>()

    // ---------------------------------------------------------------------
    // Solutions/Snapshots list + sidebar UI
    // ---------------------------------------------------------------------

    private readonly snapshotList             = document.getElementById("snapshotList")             as HTMLDivElement
    private readonly importLURDStringButton   = document.getElementById("importLURDString")         as HTMLButtonElement
    private readonly saveSnapshotButton       = document.getElementById("saveSnapshotButton")       as HTMLButtonElement
    private readonly snapshotSidebar          = document.getElementById("snapshotSidebar")          as HTMLDivElement
    private readonly showSnapshotListCheckbox = document.getElementById("showSnapshotListCheckbox") as HTMLInputElement
    private readonly filterSolutionsButton    = document.getElementById("filterSolutionsButton")    as HTMLButtonElement
    private readonly filterSnapshotsButton    = document.getElementById("filterSnapshotsButton")    as HTMLButtonElement
    private readonly snapshotContextMenu      = document.getElementById("snapshotContextMenu")      as HTMLDivElement | null

    private snapshotSidebarInitialized = false

    // ---------------------------------------------------------------------
    // Toolbar container / Layout
    // ---------------------------------------------------------------------

    readonly toolbarButtons = document.getElementById("toolbarButtons") as HTMLDivElement // main container for toolbar and board

    // ---------------------------------------------------------------------
    // Canvas / Rendering
    // ---------------------------------------------------------------------

    private readonly canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement
    private board: Board = Board.getDummyBoard()
    private skin: CommonSkinFormatBase = new NightShift3Skin()
    private readonly boardRenderer: BoardRenderer

    // Snapshot-/Solution-Sidebar view
    private readonly snapshotSidebarView: SnapshotSidebarView

    // Board rulers view (top/left labels + highlight)
    private readonly boardRulerView: BoardRulerView

    // ---------------------------------------------------------------------
    // Mouse state
    // ---------------------------------------------------------------------

    clickedPosition: number = NONE
    clickedXCoordinate = -1
    clickedYCoordinate = -1

    static isModalDialogShown = false   // used by keyboard controller to temporarily suppress key handling

    constructor(private readonly app: SokobanApp) {

        this.boardRenderer = new BoardRenderer(this.canvas, this.board, this.skin)

        this.boardRulerView = new BoardRulerView(
            this.boardRulerTop,
            this.boardRulerLeft,
            () => this.board,          // always returns current board
            this.boardRenderer
        )

        const sidebarCallbacks: SnapshotSidebarCallbacks = {
            onSetSnapshot:    (snapshot: Snapshot) => this.app.setSnapshot(snapshot),
            onCopySnapshot:   (snapshot: Snapshot) => this.app.copyMovesToClipboard(snapshot.lurd),
            onDeleteSnapshot: (snapshot: Snapshot) => this.app.deleteSnapshot(snapshot),
        }

        this.snapshotSidebarView = new SnapshotSidebarView(
            this.snapshotList,
            this.filterSolutionsButton,
            this.filterSnapshotsButton,
            this.snapshotContextMenu,
            sidebarCallbacks
        )

        // Keyboard handling is delegated to KeyboardController via UiActions.
        new KeyboardController(
            () => GUI.isModalDialogShown,
            (uiAction: Action) => this.handleAction(uiAction)
        )

        this.addListeners()

        // Avoid window scrolling when mouse wheel is used over the app
        document.body.style.overflow = "hidden"

        this.boardRenderer.adjustCanvasSize()
        this.boardRenderer.adjustNewGraphicSize()
    }

    // ---------------------------------------------------------------------
    // Action dispatch (from KeyboardController)
    // ---------------------------------------------------------------------

    /** Maps keyboard-level UiActions to concrete GUI / App behaviour. */
    private handleAction(action: Action): void {
        switch (action) {
            case Action.focusCollectionSelector:
                this.focusCollectionSelector()
                return

            case Action.focusPuzzleSelector:
                this.focusPuzzleSelector()
                return

            case Action.toggleSnapshotList:
                this.doAction(Action.toggleSnapshotList)
                return

            case Action.nextPuzzle:
                this.doAction(Action.nextPuzzle)
                return

            case Action.previousPuzzle:
                this.doAction(Action.previousPuzzle)
                return

            case Action.moveLeft:
                this.app.doAction(Action.moveLeft)
                return

            case Action.moveRight:
                this.app.doAction(Action.moveRight)
                return

            case Action.moveUp:
                this.app.doAction(Action.moveUp)
                return

            case Action.moveDown:
                this.app.doAction(Action.moveDown)
                return

            case Action.undo:
                this.app.doAction(Action.undo)
                return

            case Action.redo:
                this.app.doAction(Action.redo)
                return

            case Action.undoAll:
                this.app.doAction(Action.undoAll)
                return

            case Action.redoAll:
                this.app.doAction(Action.redoAll)
                return
        }
    }

    // ---------------------------------------------------------------------
    // Layout helpers
    // ---------------------------------------------------------------------

    /** Recalculates canvas and graphic size after sidebar visibility changed. */
    private readonly recalcLayoutAfterSidebarChange = (): void => {
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

        if (boardWidthPx > 0) {
            this.toolbarButtons.style.width = `${boardWidthPx}px`
        }
    }

    // ---------------------------------------------------------------------
    // Settings / Initial GUI state
    // ---------------------------------------------------------------------

    /** Sets all GUI elements according to the current settings. */
    async setCurrentSettings(): Promise<void> {

        // Skin
        this.updateMenuSelection(this.skinItems, "data-skinName", Settings.skinName)

        // Skin graphic size
        this.updateMenuSelection(this.graphicSizeSelectorItems, "data-skinGraphicSize", Settings.graphicSize)

        // Move animation delay
        this.updateMenuSelection(
            this.moveAnimationDelayItems,
            "data-moveAnimationDelay",
            Settings.moveAnimationDelayMs.toString()
        )

        // Selected object animation delay
        this.updateMenuSelection(
            this.selectedObjectAnimationDelayItems,
            "data-selectedObjectAnimationDelay",
            Settings.selectedObjectAnimationsSpeedPercent.toString()
        )

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

        // Load any cached Letslogic collections from local storage and make
        // them available in the collection selector so users don't need to
        // re-import on every start.
        await this.loadCachedLetslogicCollections()
    }

    /**
     * Helper to update "selected/active" CSS classes for menu items that use data-* attributes.
     */
    private updateMenuSelection(
        items: NodeListOf<HTMLElement>,
        dataAttribute: string,
        selectedValue: string
    ): void {
        items.forEach(item => {
            item.classList.remove("selected", "active")
            if (item.getAttribute(dataAttribute) === selectedValue) {
                item.classList.add("active", "selected")
            }
        })
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

    // ---------------------------------------------------------------------
    // Canvas / Mouse handling
    // ---------------------------------------------------------------------

    private canvasMouseDown(event: MouseEvent): void {
        const { clientX, clientY } = event

        this.clickedXCoordinate = clientX
        this.clickedYCoordinate = clientY

        this.clickedPosition = this.convertScreenCoordinatesToBoardPosition(clientX, clientY)
        if (this.clickedPosition !== NONE) {
            this.doAction(Action.cellClicked)
        }
    }

    private canvasMouseUp(event: MouseEvent): void {
        const { clientX, clientY } = event

        // Only treat mouse up as a drag end if mouse moved more than a few pixels
        if (
            Math.abs(clientX - this.clickedXCoordinate) < 5 &&
            Math.abs(clientY - this.clickedYCoordinate) < 5
        ) {
            return
        }

        this.clickedPosition = this.convertScreenCoordinatesToBoardPosition(clientX, clientY)
        if (this.clickedPosition !== NONE) {
            this.doAction(Action.cellClicked)
        }
    }

    /** Mouse is moved over the canvas – delegate highlight to BoardRulerView. */
    private canvasMouseMove(event: MouseEvent): void {
        const boardPos = this.boardRenderer.screenToBoard(event.clientX, event.clientY)
        this.boardRulerView.highlightForBoardPosition(boardPos)
    }

    /**
     * Returns the board position for the given screen (clientX, clientY) coordinates
     * or NONE if they do not map to a valid board cell.
     */
    private convertScreenCoordinatesToBoardPosition(clientX: number, clientY: number): number {
        const boardPos = this.boardRenderer.screenToBoard(clientX, clientY)
        return boardPos != null ? boardPos : NONE
    }

    // ---------------------------------------------------------------------
    // Canvas drawing (delegated to BoardRenderer)
    // ---------------------------------------------------------------------

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
        this.boardRulerView.updateLayout()
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

        // Prefer downward facing since this way the player looks at the user :-).
        return DOWN
    }

    /** Focus + open the collection selector (Fomantic or native). */
    private focusCollectionSelector(): void {
        if (!this.collectionSelector) return

        this.collectionSelector.focus()

        const $dropdown = ($("#collectionSelector") as any)
        if (typeof $dropdown.dropdown === "function") {
            try {
                $dropdown.dropdown("show")
            } catch {
                // Ignore if Fomantic is not initialized or throws
            }
        } else {
            this.collectionSelector.click()
        }
    }

    /** Focus + open the puzzle selector (Fomantic or native). */
    private focusPuzzleSelector(): void {
        if (!this.puzzleSelector) return

        this.puzzleSelector.focus()

        const $dropdown = ($("#puzzleSelector") as any)
        if (typeof $dropdown.dropdown === "function") {
            try {
                $dropdown.dropdown("show")
            } catch {
                // Ignore if Fomantic is not initialized or throws
            }
        } else {
            this.puzzleSelector.click()
        }
    }

    // ---------------------------------------------------------------------
    // Status / puzzle solved animation
    // ---------------------------------------------------------------------

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

    // ---------------------------------------------------------------------
    // Event listener setup
    // ---------------------------------------------------------------------

    private addListeners(): void {
        // Keyboard is fully handled by KeyboardController via UiActions.
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

    private addCanvasListeners(): void {
        this.canvas.addEventListener("mousedown", (event) => this.canvasMouseDown(event))
        this.canvas.addEventListener("mouseup",   (event) => this.canvasMouseUp(event))

        // Highlight ruler while mouse moves over the board
        this.canvas.addEventListener("mousemove", (event) => this.canvasMouseMove(event))
        this.canvas.addEventListener("mouseleave", () => this.boardRulerView.clearHighlight())

        // Only scroll when mouse is above canvas
        this.canvas.addEventListener("wheel", (event) => this.mouseScroll(event), {
            passive: false   // important so preventDefault() works
        })
    }

    private addSkinAndAnimationListeners(): void {

        // Skin change
        this.skinItems.forEach(skinItem => {
            skinItem.addEventListener("click", () => {
                this.updateMenuSelection(
                    this.skinItems,
                    "data-skinName",
                    skinItem.getAttribute("data-skinName") ?? ""
                )

                const selectedSkinName = skinItem.getAttribute("data-skinName") as SKIN_NAME | null
                if (selectedSkinName != null) {
                    this.setSkin(selectedSkinName)
                }
            })
        })

        // Graphic size change
        this.graphicSizeSelectorItems.forEach(graphicSizeItem => {
            graphicSizeItem.addEventListener("click", () => {
                this.updateMenuSelection(
                    this.graphicSizeSelectorItems,
                    "data-skinGraphicSize",
                    graphicSizeItem.getAttribute("data-skinGraphicSize") ?? ""
                )

                const selectedGraphicSize = graphicSizeItem.getAttribute("data-skinGraphicSize")
                if (selectedGraphicSize != null) {
                    this.setNewGraphicSize(selectedGraphicSize)
                }
            })
        })

        // Move animation delay
        this.moveAnimationDelayItems.forEach(moveDelayItem => {
            moveDelayItem.addEventListener("click", () => {
                this.updateMenuSelection(
                    this.moveAnimationDelayItems,
                    "data-moveAnimationDelay",
                    moveDelayItem.getAttribute("data-moveAnimationDelay") ?? ""
                )

                const moveAnimationDelay = moveDelayItem.getAttribute("data-moveAnimationDelay")
                if (moveAnimationDelay != null) {
                    Settings.moveAnimationDelayMs = +moveAnimationDelay
                }
            })
        })

        // Selected object animation delay
        this.selectedObjectAnimationDelayItems.forEach(delayItem => {
            delayItem.addEventListener("click", () => {
                this.updateMenuSelection(
                    this.selectedObjectAnimationDelayItems,
                    "data-selectedObjectAnimationDelay",
                    delayItem.getAttribute("data-selectedObjectAnimationDelay") ?? ""
                )

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
            this.puzzleFileInput!.click()
        })

        this.puzzleFileInput.addEventListener("change", async () => {
            const file = this.puzzleFileInput!.files && this.puzzleFileInput!.files[0]
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
                this.puzzleFileInput!.value = ""
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

        bindChange(this.hideWallsCheckbox,      Action.hideWalls)
        bindChange(this.soundEnabledCheckbox,   Action.toggleSoundEnabled)

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

        // Letslogic: import collections
        if (this.letslogicImportCollectionsItem) {
            this.letslogicImportCollectionsItem.addEventListener("click", () => this.openLetslogicCollectionsModal())
        }
        if (this.letslogicFetchCollectionsButton) {
            this.letslogicFetchCollectionsButton.addEventListener("click", () => void this.fetchLetslogicCollections())
        }
        if (this.letslogicSelectAllCollections) {
            this.letslogicSelectAllCollections.addEventListener("change", () => {
                const checked = this.letslogicSelectAllCollections!.checked
                if (!this.letslogicCollectionsList) return
                const inputs = this.letslogicCollectionsList.querySelectorAll<HTMLInputElement>("input[type='checkbox'][data-collection-id]")
                inputs.forEach(i => i.checked = checked)
            })
        }
        if (this.letslogicImportCollectionsConfirm) {
            this.letslogicImportCollectionsConfirm.addEventListener("click", () => void this.importSelectedLetslogicCollections())
        }

        // Database menu
        bindClick(this.databaseExportItem, Action.exportDatabase)

        // Snapshot-UI specific controls that trigger Actions
        bindClick(this.importLURDStringButton,    Action.importLURDString)
        bindChange(this.showSnapshotListCheckbox, Action.toggleSnapshotList)

        // Database menu: auto-refresh stats whenever the dropdown is opened
        if (this.databaseMenu) {
            this.databaseMenu.addEventListener("mouseenter", () => {
                this.app.refreshDatabaseStats(false)
            })
        }

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

    // ---------------------------------------------------------------------
    // Graphic size / Canvas size
    // ---------------------------------------------------------------------

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

        event.preventDefault()
        event.stopPropagation()
    }

    // ---------------------------------------------------------------------
    // Dialogs / Sidebar
    // ---------------------------------------------------------------------

    /** Shows the "How to play" modal dialog. */
    private showHowToPlay(): void {
        ($("#showHowToPlay") as any).modal({
            onShow:   () => { GUI.isModalDialogShown = true },
            onHidden: () => { GUI.isModalDialogShown = false }
        }).modal("show")
    }

    // ---------------------------------------------------------------------
    // Letslogic: import collections flow
    // ---------------------------------------------------------------------

    private openLetslogicCollectionsModal(): void {
        const key = Settings.letslogicApiKey.trim()
        if (!key) {
            // Prompt for API key first
            this.promptForLetslogicApiKey()
            return
        }

        if (!this.letslogicCollectionsModal) return
        ;($(this.letslogicCollectionsModal) as any).modal({
            onShow:   () => { GUI.isModalDialogShown = true },
            onHidden: () => { GUI.isModalDialogShown = false }
        }).modal("show")

        // initial load
        void this.fetchLetslogicCollections()
    }

    private async fetchLetslogicCollections(): Promise<void> {
        if (!this.letslogicCollectionsList || !this.letslogicCollectionsStatus) return

        const key = Settings.letslogicApiKey.trim()
        if (!key) {
            this.setLetslogicCollectionsStatus("Please set your Letslogic API key first.", true)
            return
        }

        this.setLetslogicCollectionsStatus("Loading collections…", false)
        this.letslogicCollectionsList.innerHTML = ""

        try {
            const client = new LetsLogicClient(key)
            const collections = await client.getCollections()

            if (!collections || collections.length === 0) {
                this.setLetslogicCollectionsStatus("No collections returned by Letslogic.", true)
                return
            }

            this.setLetslogicCollectionsStatus(`${collections.length} collections loaded. Select and click Import.`, false)
            // Keep a lookup for later (so we can use the true collection title when importing)
            this.letslogicCollectionsById.clear()
            for (const c of collections) {
                this.letslogicCollectionsById.set(c.id, c)
            }
            this.renderLetslogicCollectionsList(collections)
        } catch (e) {
            console.error("Failed to load Letslogic collections", e)
            this.setLetslogicCollectionsStatus("Failed to load collections. Please try again.", true)
        }
    }

    private setLetslogicCollectionsStatus(message: string, isError: boolean): void {
        if (!this.letslogicCollectionsStatus) return
        this.letslogicCollectionsStatus.style.display = "block"
        this.letslogicCollectionsStatus.className = `ui small ${isError ? "red" : "info"} message`
        this.letslogicCollectionsStatus.textContent = message
    }

    private renderLetslogicCollectionsList(collections: LetsLogicLevelCollection[]): void {
        if (!this.letslogicCollectionsList) return
        const list = this.letslogicCollectionsList
        list.innerHTML = ""

        for (const c of collections) {
            const item = document.createElement("div")
            item.className = "item"
            item.style.cursor = "pointer"

            const checkbox = document.createElement("input")
            checkbox.type = "checkbox"
            checkbox.setAttribute("data-collection-id", String(c.id))
            checkbox.style.marginRight = "8px"

            const content = document.createElement("div")
            content.className = "content"

            const header = document.createElement("div")
            header.className = "header"
            header.textContent = `${c.title} (by ${c.author || "unknown"})`

            const desc = document.createElement("div")
            desc.className = "description"
            const levelCount = (c as any).levels ?? (c as any).levelCount ?? 0
            desc.textContent = `${levelCount} levels${c.description ? " · " + c.description : ""}`

            content.appendChild(header)
            content.appendChild(desc)

            item.appendChild(checkbox)
            item.appendChild(content)

            // clicking the row toggles the checkbox
            item.addEventListener("click", (ev) => {
                if ((ev.target as HTMLElement).tagName.toLowerCase() !== "input") {
                    checkbox.checked = !checkbox.checked
                }
            })

            list.appendChild(item)
        }
    }

    private async importSelectedLetslogicCollections(): Promise<void> {
        if (!this.letslogicCollectionsList) return

        const key = Settings.letslogicApiKey.trim()
        if (!key) {
            this.setStatusText("Please set your Letslogic API key first.")
            return
        }

        const checkboxes = Array.from(this.letslogicCollectionsList.querySelectorAll<HTMLInputElement>("input[type='checkbox'][data-collection-id]:checked"))
        if (checkboxes.length === 0) {
            this.setStatusText("No Letslogic collections selected.")
            return
        }

        if (this.letslogicImportCollectionsConfirm) this.letslogicImportCollectionsConfirm.disabled = true
        try {
            const client = new LetsLogicClient(key)
            const importedNames: string[] = []

            for (let idx = 0; idx < checkboxes.length; idx++) {
                const cb = checkboxes[idx]
                const id = Number(cb.getAttribute("data-collection-id"))
                if (!Number.isFinite(id) || id <= 0) continue

                this.setStatusText(`Downloading Letslogic collection #${id}… (${idx + 1}/${checkboxes.length})`)

                const levels = await client.getLevels(id)
                if (!levels || levels.length === 0) {
                    console.warn("Letslogic collection has no levels:", id)
                    continue
                }

                // Ensure we overwrite any previously imported collection with the same Letslogic ID
                this.removeImportedCollectionsByLetslogicId(id)

                const collectionName = this.buildLetslogicCollectionName(levels, id)
                const puzzles: Puzzle[] = []

                for (let i = 0; i < levels.length; i++) {
                    const lvl = levels[i]
                    const boardOrError = Board.createFromString(lvl.map)
                    if (typeof boardOrError === "string") {
                        console.warn(`Skipping invalid board in collection #${id}:`, boardOrError)
                        continue
                    }
                    const p = new Puzzle(boardOrError)
                    p.title = lvl.title || `Puzzle ${i + 1}`
                    p.author = lvl.author || ""
                    p.letsLogicID = lvl.id
                    p.puzzleNumber = i + 1
                    puzzles.push(p)
                }

                if (puzzles.length > 0) {
                    // Prefer author from collection metadata if available, otherwise fall back to level author
                    const meta = this.letslogicCollectionsById.get(id)
                    const author = (meta?.author && meta.author.trim().length > 0)
                        ? meta.author.trim()
                        : (levels[0]?.author || "")
                    const coll = new Collection(collectionName, author, puzzles)

                    // Keep in-memory and UI state
                    this.importedCollections.set(collectionName, coll)
                    this.ensureCollectionOptionExists(collectionName)
                    if (!importedNames.includes(collectionName)) importedNames.push(collectionName)

                    // Persist in local storage so it is available on next start
                    const dto = this.buildLetslogicCollectionDTO(id, coll)
                    try { await DataStorage.storeLetslogicCollection(id, dto) } catch (e) { console.warn("Failed to cache Letslogic collection", id, e) }
                }
            }

            if (importedNames.length > 0) {
                // select first imported
                const first = importedNames[0]
                this.collectionSelector.value = first
                const importedCollection = this.importedCollections.get(first)!
                this.setCollectionForPlaying(importedCollection)
                this.puzzleSelector.selectedIndex = 0
                this.newPuzzleSelected()

                // close modal
                if (this.letslogicCollectionsModal) {
                    ;($(this.letslogicCollectionsModal) as any).modal("hide")
                }

                this.setStatusText(`Imported ${importedNames.length} Letslogic collection(s).`)
            } else {
                this.setStatusText("Nothing was imported from Letslogic.")
            }
        } catch (e) {
            console.error("Failed to import Letslogic collections", e)
            this.setStatusText("Failed to import collections from Letslogic.")
        } finally {
            if (this.letslogicImportCollectionsConfirm) this.letslogicImportCollectionsConfirm.disabled = false
        }
    }

    private ensureCollectionOptionExists(name: string): void {
        const alreadyExists = Array.from(this.collectionSelector.options).some(o => o.value === name)
        if (!alreadyExists) {
            const option = document.createElement("option")
            option.value = name
            option.text = name
            this.collectionSelector.add(option)
        }
    }

    private buildLetslogicCollectionName(levels: LetsLogicLevel[], id: number): string {
        // Prefer the actual collection title fetched from Letslogic collections endpoint
        const meta = this.letslogicCollectionsById.get(id)
        const titleFromMeta = meta?.title?.trim()
        if (titleFromMeta && titleFromMeta.length > 0) {
            return `${titleFromMeta} (Letslogic #${id})`
        }

        // Fallback: try to derive a base title from first level title (legacy behavior)
        const derived = levels[0]?.title ? levels[0].title.replace(/\s+\d+\s*$/, "").trim() : "Letslogic Collection"
        return `${derived} (Letslogic #${id})`
    }

    /**
     * Removes all imported collections (in-memory + selector option) that correspond to the given Letslogic id.
     * This helps to overwrite previously imported versions when re-importing the same collection id.
     */
    private removeImportedCollectionsByLetslogicId(id: number): void {
        const pattern = new RegExp(`\\(Letslogic #${id}\\)(?: \\[[0-9]+\\])?$`) // matches with optional [n] suffix

        // Remove from in-memory map
        for (const name of Array.from(this.importedCollections.keys())) {
            if (pattern.test(name)) {
                this.importedCollections.delete(name)
            }
        }

        // Remove matching options from selector
        const options = Array.from(this.collectionSelector.options)
        for (const opt of options) {
            if (pattern.test(opt.value)) {
                this.collectionSelector.remove(opt.index)
            }
        }
    }

    /** Build a storage DTO from a Collection for caching. */
    private buildLetslogicCollectionDTO(id: number, coll: Collection): StoredLetslogicCollectionDTO {
        return {
            id,
            title: coll.title,
            author: coll.author,
            puzzles: coll.puzzles.map(p => ({
                boardString: p.board.getBoardAsString(),
                title: p.title,
                author: p.author,
                letsLogicID: p.letsLogicID,
                puzzleNumber: p.puzzleNumber
            }))
        }
    }

    /** Loads cached Letslogic collections from storage and registers them in the UI. */
    private async loadCachedLetslogicCollections(): Promise<void> {
        try {
            const dtos = await DataStorage.loadAllLetslogicCollections()
            if (!dtos || dtos.length === 0) return

            for (const dto of dtos) {
                // Reconstruct puzzles
                const puzzles: Puzzle[] = []
                for (const p of dto.puzzles) {
                    const boardOrError = Board.createFromString(p.boardString)
                    if (typeof boardOrError === "string") {
                        console.warn("Skipping invalid cached board in collection", dto.id, boardOrError)
                        continue
                    }
                    const puzzle = new Puzzle(boardOrError)
                    puzzle.title = p.title
                    puzzle.author = p.author
                    puzzle.letsLogicID = p.letsLogicID
                    puzzle.puzzleNumber = p.puzzleNumber
                    puzzles.push(puzzle)
                }

                if (puzzles.length === 0) continue

                const coll = new Collection(dto.title, dto.author, puzzles)
                // Use dto.title as the selector key
                if (!this.importedCollections.has(dto.title)) {
                    this.importedCollections.set(dto.title, coll)
                    this.ensureCollectionOptionExists(dto.title)
                }
            }
        } catch (e) {
            console.warn("Failed to load cached Letslogic collections", e)
        }
    }

    /** Shows or hides the snapshot list sidebar (Fomantic sidebar). */
    private setSnapshotListVisible(visible: boolean): void {
        const sidebar = ($("#snapshotSidebar") as any)

        // Initialize sidebar behavior once
        if (!this.snapshotSidebarInitialized) {
            sidebar.sidebar({
                dimPage: false,
                closable: false,
                onVisible: this.recalcLayoutAfterSidebarChange,
                onHidden: this.recalcLayoutAfterSidebarChange
            })
            this.snapshotSidebarInitialized = true
        }

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

    // ---------------------------------------------------------------------
    // Collections / Puzzles
    // ---------------------------------------------------------------------

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

        PuzzleCollectionIO
            .loadPuzzleCollection(`resources/puzzles/${puzzleCollectionName}`)
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
            puzzleItem.innerText = `${puzzle.puzzleNumber} - ${puzzle.title}`
            this.puzzleSelector.appendChild(puzzleItem)
        }
    }

    /** Sets the selected puzzle in the collection as the active puzzle. */
    private newPuzzleSelected(): void {
        const rawValue = this.puzzleSelector.value
        // value is "n - title" so we parse the number before the dash
        const puzzleNumber = parseInt(rawValue.split(" - ")[0] ?? "1", 10)

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

    // ---------------------------------------------------------------------
    // Snapshots / Solutions sidebar (delegated to SnapshotSidebarView)
    // ---------------------------------------------------------------------

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

    // ---------------------------------------------------------------------
    // Letslogic progress integration
    // ---------------------------------------------------------------------

    /**
     * Creates a LetslogicProgressCallbacks implementation that updates the
     * "Letslogic progress" modal in the GUI.
     *
     * SokobanApp can pass the returned callbacks object to LetslogicService so that
     * every submission (single puzzle or full collection) becomes visible to the user.
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

    // ---------------------------------------------------------------------
    // Action dispatch
    // ---------------------------------------------------------------------

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

            case Action.toggleRuler:
                if (this.showRulerCheckbox) {
                    Settings.showRulerFlag = this.showRulerCheckbox.checked
                }
                this.boardRulerView.updateLayout()
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

    public setDatabaseStats(boards: number, solutions: number, snapshots: number): void {
        if (this.databaseBoardsCount) {
            this.databaseBoardsCount.textContent = String(boards)
        }
        if (this.databaseSolutionsCount) {
            this.databaseSolutionsCount.textContent = String(solutions)
        }
        if (this.databaseSnapshotsCount) {
            this.databaseSnapshotsCount.textContent = String(snapshots)
        }
    }

    // ---------------------------------------------------------------------
    // Static helpers for background styling
    // ---------------------------------------------------------------------

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
}
