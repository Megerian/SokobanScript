import { Board, REACHABLE_BOX, REACHABLE_PLAYER } from "../board/Board"
import { NONE, SokobanApp } from "../app/SokobanApp"
import { CommonSkinFormatBase, SKIN_NAME, SpriteData } from "../skins/commonSkinFormat/CommonSkinFormatBase"
import { XSB_BACKGROUND, XSB_WALL } from "../Sokoban/PuzzleFormat"
import { Utilities } from "../Utilities/Utilities"
import { Settings } from "../app/Settings"
import { Snapshot } from "../Sokoban/domainObjects/Snapshot"
import { PuzzleCollectionIO } from "../services/PuzzleCollectionIO"
import { Collection } from "../Sokoban/domainObjects/Collection"
import { Puzzle } from "../Sokoban/domainObjects/Puzzle"
import { DIRECTION, Directions, UP } from "../Sokoban/Directions"
import { NightShift3Skin } from "../skins/commonSkinFormat/NighShift3Skin"
import { SkinLoader } from "../skins/SkinLoader"
import { Solution } from "../Sokoban/domainObjects/Solution"

export const enum Action {
    puzzleSelected = "puzzleSelected",              // kept name for compatibility (represents "puzzleSelected")
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
    importPuzzleFromClipboard = "importPuzzleFromClipboard",   // semantically: importPuzzleFromClipboard
    copyPuzzleToClipboard = "copyPuzzleToClipboard",           // semantically: copyPuzzleToClipboard
    importLURDString = "importLURDString",
    saveSnapshot = "saveSnapshot",
    toggleDeleteSnapshotMode = "toggleDeleteSnapshotMode",

    cellClicked = "cellClicked",
}

export class GUI {

    // --- Status elements used by SokobanApp ---
    movesText    = document.getElementById("moves")     as HTMLSpanElement
    pushesText   = document.getElementById("pushes")    as HTMLSpanElement
    boardDisplay = document.getElementById("grid")      as HTMLElement
    debugText    = document.getElementById("debugText") as HTMLElement

    /** View menu (skin, animation, etc.) */
    private skinItems                         = document.querySelectorAll("[data-skinName]")
    private graphicSizeSelectorItems          = document.querySelectorAll("[data-skinGraphicSize]")
    private moveAnimationDelayItems           = document.querySelectorAll("[data-moveAnimationDelay]")
    private selectedObjectAnimationDelayItems = document.querySelectorAll("[data-selectedObjectAnimationDelay]")
    private showAnimationsCheckbox            = document.getElementById("showAnimations") as HTMLInputElement

    /** Settings menu */
        // Sound
    private soundEnabledCheckbox = document.getElementById("soundEnabled") as HTMLInputElement
    // Background
    private backgroundColor           = document.getElementById("backgroundColor")           as HTMLInputElement
    private setDefaultBackgroundColor = document.getElementById("setDefaultBackgroundColor") as HTMLInputElement
    private setDropsBackgroundImage   = document.getElementById("setDropsBackgroundImage")   as HTMLButtonElement

    /** Toolbar elements */
    undoAllButton         = document.getElementById("undoAllButton")         as HTMLButtonElement
    undoButton            = document.getElementById("undoButton")            as HTMLButtonElement
    redoButton            = document.getElementById("redoButton")            as HTMLButtonElement
    redoAllButton         = document.getElementById("redoAllButton")         as HTMLButtonElement
    private hideWallsCheckbox        = document.getElementById("hideWalls")                as HTMLInputElement
    private copyMovesAsString        = document.getElementById("copyMovesAsString")        as HTMLInputElement
    private pasteMovesFromClipboard  = document.getElementById("pasteMovesFromClipboard")  as HTMLInputElement
    private importPuzzleFromClipboard = document.getElementById("importPuzzleFromClipboard") as HTMLInputElement
    private exportPuzzleFromClipboard = document.getElementById("exportPuzzleFromClipboard") as HTMLInputElement
    private importPuzzleFromFile      = document.getElementById("importPuzzleFromFile")      as HTMLDivElement
    private puzzleFileInput           = document.getElementById("puzzleFileInput")           as HTMLInputElement
    private howToPlayMenuItem        = document.getElementById("howToPlay")                as HTMLInputElement

    /** Status bar */
    private statusTextLabel = document.getElementById("statusTextLabel") as HTMLLabelElement
    private statusText      = document.getElementById("statusText")      as HTMLSpanElement

    /** Collection and puzzle selectors */
    private collectionSelector = document.getElementById("collectionSelector") as HTMLSelectElement
    private puzzleSelector     = document.getElementById("puzzleSelector")      as HTMLSelectElement
    private puzzleCollection   = new Collection("", "", [])    // Currently active puzzle collection

    // Imported collections keyed by display name (usually filename without extension).
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
    private contextMenuSnapshot: Snapshot | null = null

    private showSolutions = true
    private showSnapshots = true
    private isDeleteSnapshotMode = false

    toolbarButtons = document.getElementById("toolbarButtons") as HTMLDivElement  // main container for toolbar and board

    // Canvas / Rendering
    private canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement
    private ctx = this.canvas.getContext("2d")!

    private isShowPlayerSelectedAnimationActivated = false
    private isShowBoxSelectedAnimationActivated    = false
    private selectedObjectAnimationCount = 0                 // Only one selection animation at a time
    private boxPositionAnAnimationIsShownFor: number = NONE  // position of the box currently animated

    // Mouse
    clickedPosition: number = NONE      // board position that was clicked
    clickedXCoordinate: number = -1     // x-coordinate of mouse event
    clickedYCoordinate: number = -1     // y-coordinate of mouse event

    // Board/Skin
    private board = Board.getDummyBoard()
    private skin: CommonSkinFormatBase = new NightShift3Skin()
    private graphicDisplaySize = 44         // width/height of graphics on screen

    static isModalDialogShown = false       // used to temporarily suppress key handling

    constructor(private readonly app: SokobanApp) {
        this.addListeners()

        document.body.style.overflow = "hidden" // avoid window scrolling when mouse wheel is used
        this.ctx.imageSmoothingQuality = "high"

        this.adjustCanvasSize()                 // adjust canvas to window size
    }

    // ------------------------------------------------------------------------
    // Settings / Initial GUI state
    // ------------------------------------------------------------------------

    /** Sets all GUI elements according to the current settings. */
    async setCurrentSettings() {

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

        await this.setSkin(Settings.skinName)

        if (Settings.backgroundImageName.length > 0) {
            GUI.setBackgroundImage(Settings.backgroundImageName)
        } else {
            GUI.setNewBackgroundColor(Settings.backgroundColor)
        }

        // Snapshot list visibility
        this.showSnapshotListCheckbox.checked = Settings.showSnapshotListFlag
        GUI.setSnapshotListVisible(Settings.showSnapshotListFlag)
    }

    async setSkin(skinName: SKIN_NAME): Promise<void> {
        this.skin = await SkinLoader.loadSkinByName(skinName)
        Settings.skinName = skinName

        this.adjustNewGraphicSize()
        this.restartAnimations()
    }

    /** Called when a new puzzle is loaded in the app. */
    newPuzzleLoaded() {
        // Keep a direct reference to the current board of the active puzzle
        this.board = this.app.board

        this.adjustNewGraphicSize()
        this.updateCanvas()
    }

    // ------------------------------------------------------------------------
    // Canvas / Mouse handling
    // ------------------------------------------------------------------------

    private canvasMouseDown(event: MouseEvent) {
        this.clickedXCoordinate = event.x
        this.clickedYCoordinate = event.y

        this.clickedPosition = this.convertScreenCoordinatesToBoardPosition(event.x, event.y)
        if (this.clickedPosition !== NONE) {
            this.doAction(Action.cellClicked)
        }
    }

    private canvasMouseUp(event: MouseEvent) {
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

    /**
     * Returns the board position for the given screen (x, y) coordinates
     * or NONE if they do not map to a valid board cell.
     */
    private convertScreenCoordinatesToBoardPosition(x: number, y: number): number {

        const rect = this.canvas.getBoundingClientRect()
        const canvasX = x - rect.left
        const canvasY = y - rect.top

        const cellX = Math.floor(canvasX / this.graphicDisplaySize)
        const cellY = Math.floor(canvasY / this.graphicDisplaySize)

        const boardPosition = cellY * this.board.width + cellX

        const isLegalBoardPosition =
            cellX >= 0 && cellX < this.board.width &&
            cellY >= 0 && cellY < this.board.height

        return isLegalBoardPosition ? boardPosition : NONE
    }

    // ------------------------------------------------------------------------
    // Canvas drawing
    // ------------------------------------------------------------------------

    updateCanvas(): void {
        this.updateCanvasForPositions(...this.board.positions)
    }

    /**
     * Updates the images on the canvas for all given board positions.
     */
    updateCanvasForPositions(...positions: number[]): void {

        for (const position of positions) {
            const boardElement = this.board.getXSB_Char(position)

            if (boardElement === XSB_BACKGROUND) {
                continue
            }

            const { outputX, outputY } = this.getCanvasCoordinatesForPosition(position)

            if (boardElement === XSB_WALL && Settings.hideWallsFlag) {
                this.ctx.clearRect(outputX, outputY, this.graphicDisplaySize, this.graphicDisplaySize)
                continue
            }

            const playerViewDirection = this.getPlayerViewDirection()
            const spriteData = this.skin.getSprite(this.board, position, playerViewDirection)
            this.drawSprite(spriteData, outputX, outputY)

            const reachable = this.board.reachableMarker[position]
            if (reachable === REACHABLE_PLAYER || reachable === REACHABLE_BOX) {
                this.drawReachableGraphic(outputX, outputY)
            }
        }

        this.showAnimations()
    }

    /**
     * Starts or stops selection animations for player/box as needed.
     */
    private showAnimations() {

        if (this.skin.playerSelectedAnimationSprites.length === 0) {
            return  // skin doesn't support animations
        }

        // Stop box animation if a different box is selected or nothing is selected
        if (
            this.isShowBoxSelectedAnimationActivated &&
            this.boxPositionAnAnimationIsShownFor !== this.app.selectedBoxPosition
        ) {
            this.isShowBoxSelectedAnimationActivated = false
        }

        if (Settings.showAnimationFlag) {
            // Player animation
            if (this.app.isPlayerSelected && !this.isShowPlayerSelectedAnimationActivated) {
                this.showPlayerSelectedAnimation()
            }

            // Box animation
            if (this.app.selectedBoxPosition !== NONE && !this.isShowBoxSelectedAnimationActivated) {
                this.showBoxSelectedAnimation()
            }
        }

        if (this.app.selectedBoxPosition === NONE && this.isShowBoxSelectedAnimationActivated) {
            this.isShowBoxSelectedAnimationActivated = false
        }
        if (!this.app.isPlayerSelected && this.isShowPlayerSelectedAnimationActivated) {
            this.isShowPlayerSelectedAnimationActivated = false
        }
    }

    /**
     * Shows repeated animation over the currently selected box.
     */
    private showBoxSelectedAnimation() {
        const animationGraphics = this.board.isGoal(this.app.selectedBoxPosition)
            ? this.skin.boxOnGoalSelectedAnimationSprites
            : this.skin.boxSelectedAnimationSprites

        const drawNextAnimationGraphic =
            this.getDrawAnimationGraphicsAtPositionFunction(animationGraphics, this.app.selectedBoxPosition)

        this.isShowBoxSelectedAnimationActivated = true
        this.boxPositionAnAnimationIsShownFor = this.app.selectedBoxPosition

        const animationTimestamp = ++this.selectedObjectAnimationCount
        const isAnimationActive = () =>
            this.isShowBoxSelectedAnimationActivated && animationTimestamp === this.selectedObjectAnimationCount

        let previousTimestamp = 0

        const drawGraphicLoop = (timestamp: DOMHighResTimeStamp) => {
            const elapsedInMs = timestamp - previousTimestamp
            const currentAnimationDelayInMs =
                (1000 / animationGraphics.length / Settings.selectedObjectAnimationsSpeedPercent) * 100 // 1 animation per second default

            if (isAnimationActive()) {
                if (elapsedInMs >= currentAnimationDelayInMs) {
                    drawNextAnimationGraphic()
                    previousTimestamp = timestamp
                }
                requestAnimationFrame(drawGraphicLoop)
            }
        }

        requestAnimationFrame(drawGraphicLoop)
    }

    /**
     * Shows repeated animation over the player when selected.
     */
    private showPlayerSelectedAnimation() {
        const animationGraphics = this.board.isGoal(this.board.playerPosition)
            ? this.skin.playerOnGoalSelectedAnimationSprites
            : this.skin.playerSelectedAnimationSprites

        const drawNextAnimationGraphic =
            this.getDrawAnimationGraphicsAtPositionFunction(animationGraphics, this.board.playerPosition)

        this.isShowPlayerSelectedAnimationActivated = true

        const animationTimestamp = ++this.selectedObjectAnimationCount
        const isAnimationActive = () =>
            this.isShowPlayerSelectedAnimationActivated && animationTimestamp === this.selectedObjectAnimationCount

        let previousTimestamp = 0

        const drawGraphicLoop = (timestamp: DOMHighResTimeStamp) => {
            const elapsedInMs = timestamp - previousTimestamp
            const currentAnimationDelayInMs =
                (1000 / animationGraphics.length / Settings.selectedObjectAnimationsSpeedPercent) * 100

            if (isAnimationActive()) {
                if (elapsedInMs >= currentAnimationDelayInMs) {
                    drawNextAnimationGraphic()
                    previousTimestamp = timestamp
                }
                requestAnimationFrame(drawGraphicLoop)
            }
        }

        requestAnimationFrame(drawGraphicLoop)
    }

    /**
     * Returns a function that cycles through the given sprite list
     * and draws one sprite per call at the given board position.
     */
    private getDrawAnimationGraphicsAtPositionFunction(
        graphics: Array<SpriteData>,
        position: number
    ): () => void {

        const { outputX, outputY } = this.getCanvasCoordinatesForPosition(position)
        const animationGraphics = graphics

        let graphicIndex = 0

        return () => {
            this.drawSprite(animationGraphics[graphicIndex], outputX, outputY)
            graphicIndex = (graphicIndex + 1) % animationGraphics.length
        }
    }

    /** Returns the canvas coordinates of the given board position. */
    private getCanvasCoordinatesForPosition(position: number): { outputX: number, outputY: number } {
        const { x, y } = this.getXYCoordinatesOf(position)
        return {
            outputX: x * this.graphicDisplaySize,
            outputY: y * this.graphicDisplaySize
        }
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
        for (const direction of Directions.DIRECTIONS) {
            const neighborPosition = this.board.getNeighborPosition(this.board.playerPosition, direction)
            if (!this.board.isWall(neighborPosition)) {
                return direction
            }
        }

        return UP
    }

    /**
     * Draws the given sprite on the canvas at the given output coordinates.
     */
    private drawSprite(imageData: SpriteData, outputX: number, outputY: number) {
        const imageSize = this.skin.getImageSize()
        const scaleFactor = this.graphicDisplaySize / imageSize
        const scaledOutputWidth  = scaleFactor * imageSize
        const scaledOutputHeight = scaleFactor * imageSize

        this.ctx.drawImage(imageData.image, outputX, outputY, scaledOutputWidth, scaledOutputHeight)

        if (imageData.beautyGraphic != null) {
            const beautyGraphic = imageData.beautyGraphic
            this.ctx.drawImage(
                beautyGraphic.image,
                outputX + scaleFactor * beautyGraphic.xDrawOffset,
                outputY + scaleFactor * beautyGraphic.yDrawOffset,
                scaledOutputWidth,
                scaledOutputHeight
            )
        }

        imageData.rectanglesToClear.forEach(rectangle =>
            this.ctx.clearRect(
                outputX + rectangle.x * scaleFactor,
                outputY + rectangle.y * scaleFactor,
                rectangle.width * scaleFactor,
                rectangle.height * scaleFactor
            )
        )
    }

    /** Draws a small circle marking a reachable position. */
    private drawReachableGraphic(outputX: number, outputY: number) {
        const circleX = outputX + Math.round(this.graphicDisplaySize / 2)
        const circleY = outputY + Math.round(this.graphicDisplaySize / 2)

        const radius = Math.floor(this.graphicDisplaySize * 0.15)
        this.ctx.beginPath()
        this.ctx.arc(circleX, circleY, radius, 0, 2 * Math.PI)
        this.ctx.fillStyle = Settings.reachablePositionColor
        this.ctx.fill()

        this.ctx.strokeStyle = "rgba(0, 0, 0, 0.7)"
        this.ctx.arc(circleX, circleY, radius, 0, 2 * Math.PI)
        this.ctx.stroke()
    }

    // ------------------------------------------------------------------------
    // Status / puzzle solved animation
    // ------------------------------------------------------------------------

    setStatusText(text: string): void  {
        this.statusTextLabel.classList.remove("hidden")
        this.statusText.textContent = text
    }

    showPuzzleSolvedAnimation() {
        // Overlay div shows "Puzzle solved!" in the HTML.
        const solvedDiv = document.getElementById("puzzleSolvedDiv") as HTMLDivElement | null
        if (!solvedDiv) return

        // Horizontally center over the board width (same width as toolbarButtons)
        const toolbar = document.getElementById("toolbarButtons") as HTMLDivElement | null
        if (toolbar) {
            const boardWidth = toolbar.offsetWidth
            // center of the board in pixels, relative to the left edge of canvasDIV
            solvedDiv.style.left = `${boardWidth / 2}px`
        }

        solvedDiv.style.visibility = ""
        this.canvas.classList.add("animating", "transition", "tada")
        setTimeout(() => {
            this.canvas.classList.remove("animating", "transition", "tada")
            solvedDiv.style.visibility = "hidden"
        }, 1500)
    }

    private getXYCoordinatesOf(position: number): { x: number, y: number } {
        return {
            x: position % this.board.width,
            y: Math.floor(position / this.board.width)
        }
    }

    // ------------------------------------------------------------------------
    // Event listener setup
    // ------------------------------------------------------------------------

    private addListeners() {

        this.addKeyboardListeners()
        this.addCanvasListeners()
        this.addSkinAndAnimationListeners()
        this.addFileImportListeners()
        this.addToolbarAndMenuListeners()
        this.addSnapshotSidebarListeners()
        this.addContextMenuListeners()

        window.addEventListener("resize", () => {
            this.adjustCanvasSize()
            this.adjustNewGraphicSize()
            this.updateCanvas()
        })
    }

    private addKeyboardListeners() {

        document.addEventListener("keydown", (event) => {

            if (event.shiftKey || event.ctrlKey || GUI.isModalDialogShown) {
                return
            }

            switch (event.key) {

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
                case "l":
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
            }
        })
    }

    private addCanvasListeners() {
        this.canvas.addEventListener("mousedown", (event) => this.canvasMouseDown(event))
        this.canvas.addEventListener("mouseup", (event) => this.canvasMouseUp(event))
        document.addEventListener("wheel", (event) => this.mouseScroll(event))
    }

    private addSkinAndAnimationListeners() {

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

    private addFileImportListeners() {
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
                let existingOption = Array.from(this.collectionSelector.options)
                    .find(option => option.value === baseName)

                if (!existingOption) {
                    const option = document.createElement("option")
                    option.value = baseName
                    option.text  = baseName
                    this.collectionSelector.add(option)
                    existingOption = option
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

    private addToolbarAndMenuListeners() {

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

        bindClick(this.copyMovesAsString,        Action.copyMovesAsString)
        bindClick(this.pasteMovesFromClipboard,  Action.pasteMovesFromClipboard)
        bindClick(this.importPuzzleFromClipboard, Action.importPuzzleFromClipboard)
        bindClick(this.exportPuzzleFromClipboard, Action.copyPuzzleToClipboard)

        bindClick(this.howToPlayMenuItem, Action.howToPlay)

        this.filterSolutionsButton.addEventListener("click", () => this.toggleSolutionFilter())
        this.filterSnapshotsButton.addEventListener("click", () => this.toggleSnapshotFilter())

        bindClick(this.importLURDStringButton,    Action.importLURDString)
        bindClick(this.deleteSnapshotButton,      Action.toggleDeleteSnapshotMode)
        bindChange(this.showSnapshotListCheckbox, Action.toggleSnapshotList)

        this.collectionSelector.addEventListener("change", () => this.doAction(Action.collectionSelected))
        this.puzzleSelector.addEventListener("change",      () => this.doAction(Action.puzzleSelected))
    }

    private addSnapshotSidebarListeners() {
        this.saveSnapshotButton.addEventListener("click", () => this.doAction(Action.saveSnapshot))
    }

    private addContextMenuListeners() {
        // Global listeners to close the context menu
        document.addEventListener("click", () => this.closeSnapshotContextMenu())
        document.addEventListener("scroll", () => this.closeSnapshotContextMenu(), true)
        document.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                this.closeSnapshotContextMenu()
            }
        })

        document.getElementById("contextSetSnapshot")?.addEventListener("click", (e: Event) => {
            e.stopPropagation()
            if (this.contextMenuSnapshot) {
                this.app.setSnapshot(this.contextMenuSnapshot)
            }
            this.closeSnapshotContextMenu()
        })

        document.getElementById("contextCopySnapshot")?.addEventListener("click", (e: Event) => {
            e.stopPropagation()
            if (this.contextMenuSnapshot) {
                this.app.copyMovesToClipboard(this.contextMenuSnapshot.lurd)
            }
            this.closeSnapshotContextMenu()
        })

        document.getElementById("contextDeleteSnapshot")?.addEventListener("click", (e: Event) => {
            e.stopPropagation()
            if (this.contextMenuSnapshot) {
                this.app.deleteSnapshot(this.contextMenuSnapshot)
            }
            this.closeSnapshotContextMenu()
        })
    }

    // ------------------------------------------------------------------------
    // Graphic size / Canvas size
    // ------------------------------------------------------------------------

    /** Adjusts the current graphic size based on settings and current puzzle board size. */
    private adjustNewGraphicSize(): void {

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        const newGraphicSize = Settings.graphicSize === "auto"
            ? this.getMaximalGraphicSize()
            : +Settings.graphicSize

        this.graphicDisplaySize = newGraphicSize

        // Ensure main UI width matches board width
        this.toolbarButtons.style.width = (this.board.width * newGraphicSize) + "px"
    }

    /** Returns the maximum graphic size that fits within the canvas. */
    private getMaximalGraphicSize(): number {

        const maxWidth  = Math.floor(this.canvas.width  / this.board.width)
        const maxHeight = Math.floor(this.canvas.height / this.board.height)
        const maxGraphicSizeForWindow = Math.min(maxWidth, maxHeight)

        const MINIMUM_GRAPHIC_SIZE = 16
        const MAXIMUM_GRAPHIC_SIZE = Math.min(64, this.skin.getImageSize())

        return Utilities.coerceIn(maxGraphicSizeForWindow, MINIMUM_GRAPHIC_SIZE, MAXIMUM_GRAPHIC_SIZE)
    }

    /** Sets canvas size so it fits within the window with a margin. */
    private adjustCanvasSize() {
        const canvasRect = this.canvas.getBoundingClientRect()

        const MARGIN = 32

        const availableHorizontalSize = window.innerWidth  - canvasRect.left - MARGIN
        const availableVerticalSize   = window.innerHeight - canvasRect.top  - MARGIN

        this.canvas.width  = availableHorizontalSize
        this.canvas.height = availableVerticalSize
    }

    private mouseScroll(event: WheelEvent) {
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
    private showHowToPlay() {
        ($("#showHowToPlay") as any).modal({
            onShow:   () => { GUI.isModalDialogShown = true },
            onHidden: () => { GUI.isModalDialogShown = false }
        }).modal("show")
    }

    /** Shows or hides the snapshot list sidebar. */
    private static setSnapshotListVisible(visible: boolean) {
        const sidebar = ($("#snapshotSidebar") as any)

        // Initialize sidebar behavior
        sidebar.sidebar({
            dimPage: false,
            closable: false,
            context: $("#pusher")
        })

        if (visible) {
            sidebar.sidebar("show")
        } else {
            sidebar.sidebar("hide")
        }
    }

    /** Toggles delete mode for snapshots/solutions. */
    private toggleDeleteSnapshotMode(): void {
        this.isDeleteSnapshotMode = !this.isDeleteSnapshotMode

        if (this.isDeleteSnapshotMode) {
            this.snapshotSidebar.classList.add("delete-mode")
            this.deleteSnapshotButton.classList.add("red")
            this.deleteSnapshotButton.innerHTML = '<i class="check icon"></i> Done deleting'
        } else {
            this.snapshotSidebar.classList.remove("delete-mode")
            this.deleteSnapshotButton.classList.remove("red")
            this.deleteSnapshotButton.innerHTML = '<i class="trash icon"></i> Delete snapshots'
        }
    }

    // ------------------------------------------------------------------------
    // Snapshot/Solution filter
    // ------------------------------------------------------------------------

    /** Toggles visibility of solution items in the snapshot list. */
    private toggleSolutionFilter(): void {
        this.showSolutions = !this.showSolutions
        this.updateFilterButtonState(this.filterSolutionsButton, this.showSolutions)
        this.applySnapshotFilters()
    }

    /** Toggles visibility of snapshot items in the snapshot list. */
    private toggleSnapshotFilter(): void {
        this.showSnapshots = !this.showSnapshots
        this.updateFilterButtonState(this.filterSnapshotsButton, this.showSnapshots)
        this.applySnapshotFilters()
    }

    private updateFilterButtonState(button: HTMLButtonElement, active: boolean): void {
        if (active) {
            button.classList.add("primary", "active")
            button.classList.remove("basic")
        } else {
            button.classList.remove("primary", "active")
            button.classList.add("basic")
        }
    }

    /** Applies the current filter state to all snapshot/solution items. */
    private applySnapshotFilters(): void {
        const items = this.snapshotList.querySelectorAll(".item.solution, .item.snapshot") as NodeListOf<HTMLElement>

        items.forEach(item => {
            if (item.classList.contains("solution")) {
                item.style.display = this.showSolutions ? "" : "none"
            } else if (item.classList.contains("snapshot")) {
                item.style.display = this.showSnapshots ? "" : "none"
            }
        })
    }

    // ------------------------------------------------------------------------
    // Collections / Puzzles
    // ------------------------------------------------------------------------

    /**
     * Called when the user selects a different collection in the dropdown.
     */
    private newCollectionSelected() {

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
    private setUserPuzzleForPlaying(boardAsString: string) {

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
    private setCollectionForPlaying(collection: Collection) {
        this.puzzleCollection = collection

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
    private newPuzzleSelected() {
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

    // ------------------------------------------------------------------------
    // Snapshots / Solutions sidebar
    // ------------------------------------------------------------------------

    /** Removes all snapshot/solution items from the sidebar list. */
    clearSnapshotList(): void {
        const items = this.snapshotList.querySelectorAll(".item")
        items.forEach(item => item.remove())
    }

    /** Adds the given snapshot or solution to the sidebar list. */
    updateSnapshotList(snapshot: Snapshot) {

        const isSolution = snapshot instanceof Solution
        const cssClass   = isSolution ? "solution" : "snapshot"

        const snapshotItem = document.createElement("div")
        snapshotItem.classList.add("item", cssClass)
        snapshotItem.id = "snapshot" + snapshot.uniqueID

        // Fomantic-style item: icon + content (header + description)
        const icon = document.createElement("i")
        icon.classList.add(isSolution ? "star" : "camera", "icon")

        const contentDiv = document.createElement("div")
        contentDiv.classList.add("content")

        const headerDiv = document.createElement("div")
        headerDiv.classList.add("header")
        headerDiv.innerText = isSolution ? "Solution" : "Snapshot"

        const descriptionDiv = document.createElement("div")
        descriptionDiv.classList.add("description")
        descriptionDiv.innerText = `${snapshot.moveCount} moves / ${snapshot.pushCount} pushes`

        contentDiv.appendChild(headerDiv)
        contentDiv.appendChild(descriptionDiv)

        // Delete icon (X) on the right side
        const deleteIcon = document.createElement("i")
        deleteIcon.classList.add("close", "icon", "snapshot-delete-icon")

        // Clicking delete icon should NOT trigger the double-click load.
        deleteIcon.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation()
            this.app.deleteSnapshot(snapshot)
        })

        // Right-click = open context menu for this snapshot/solution
        snapshotItem.addEventListener("contextmenu", (event: MouseEvent) => {
            event.preventDefault()
            event.stopPropagation()

            this.contextMenuSnapshot = snapshot
            this.openSnapshotContextMenu(event.clientX, event.clientY)
        })

        snapshotItem.appendChild(icon)
        snapshotItem.appendChild(contentDiv)
        snapshotItem.appendChild(deleteIcon)

        // Double-click loads this snapshot / solution on the board (not a "replay" animation).
        snapshotItem.addEventListener("dblclick", () => {
            this.app.setSnapshot(snapshot)
        })

        this.snapshotList.appendChild(snapshotItem)

        ;(($("#" + snapshotItem.id) as any)).transition("jiggle", "0.5s")

        this.applySnapshotFilters()
    }

    /** Removes the given snapshot/solution item from the sidebar list. */
    removeSnapshotFromList(snapshot: Snapshot): void {
        const item = document.getElementById("snapshot" + snapshot.uniqueID)
        if (item) {
            item.remove()
        }
    }

    // ------------------------------------------------------------------------
    // Action dispatch
    // ------------------------------------------------------------------------

    /**
     * Handles an action triggered by the GUI.
     * If this GUI cannot handle the action itself, it forwards it to the app.
     */
    private doAction(action: Action) {

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
                this.toggleSnapshotList()
                break

            case Action.toggleDeleteSnapshotMode:
                this.toggleDeleteSnapshotMode()
                break

            case Action.collectionSelected:
                this.newCollectionSelected()
                break

            case Action.puzzleSelected:
                this.newPuzzleSelected()
                break

            case Action.showAnimationsCheckbox:
                Settings.showAnimationFlag = this.showAnimationsCheckbox.checked
                this.restartAnimations()
                this.showAnimations()
                this.updateCanvas()
                break

            default:
                // All other actions (moves, undo/redo, clipboard, snapshots) are handled by the app.
                this.app.doAction(action)
        }
    }

    /** Toggles the snapshot list visibility and saves the setting. */
    private toggleSnapshotList(): void {
        const newValue = !Settings.showSnapshotListFlag
        Settings.showSnapshotListFlag = newValue
        this.showSnapshotListCheckbox.checked = newValue
        GUI.setSnapshotListVisible(newValue)
    }

    /**
     * If any animations are running, stop and restart them so they
     * immediately use new delay values and skin graphics.
     */
    private restartAnimations() {
        if (this.isShowPlayerSelectedAnimationActivated) {
            this.isShowPlayerSelectedAnimationActivated = false
            this.showAnimations()
        }
        if (this.isShowBoxSelectedAnimationActivated) {
            this.isShowBoxSelectedAnimationActivated = false
            this.showAnimations()
        }
    }

    /** Sets a new graphic size for the board display. */
    private setNewGraphicSize(selectedGraphicSize: string) {
        Settings.graphicSize = selectedGraphicSize
        this.adjustNewGraphicSize()
        this.restartAnimations()
        this.showAnimations()
        this.updateCanvas()
    }

    /** Updates the background color and clears any background image. */
    private static setNewBackgroundColor(backgroundColor: string) {
        Settings.backgroundColor = backgroundColor
        Settings.backgroundImageName = ""
        document.body.setAttribute(
            "style",
            `background-color: ${backgroundColor} !important; overflow: hidden;`
        )
    }

    /** Sets a new background image. */
    private static setBackgroundImage(imageFileName: string) {
        Settings.backgroundImageName = imageFileName
        document.body.setAttribute(
            "style",
            `background-image: url(/resources/backgroundImages/${imageFileName});` +
            "background-size: 100% 100%; overflow: hidden;"
        )
    }

    // ------------------------------------------------------------------------
    // Context menu for snapshots/solutions
    // ------------------------------------------------------------------------

    /** Opens the snapshot/solution context menu at the given screen coordinates. */
    private openSnapshotContextMenu(x: number, y: number): void {
        if (!this.snapshotContextMenu) return

        // Update labels so they match the type (solution vs. snapshot).
        this.updateContextMenuLabels()

        this.snapshotContextMenu.style.display = "block"

        // Initial position at cursor
        this.snapshotContextMenu.style.left = `${x}px`
        this.snapshotContextMenu.style.top  = `${y}px`

        const rect = this.snapshotContextMenu.getBoundingClientRect()

        let left = rect.left
        let top  = rect.top

        // Adjust if the menu goes out of the viewport
        if (rect.right > window.innerWidth) {
            left = Math.max(0, window.innerWidth - rect.width - 8)
        }
        if (rect.bottom > window.innerHeight) {
            top = Math.max(0, window.innerHeight - rect.height - 8)
        }

        this.snapshotContextMenu.style.left = `${left}px`
        this.snapshotContextMenu.style.top  = `${top}px`
    }

    /**
     * Updates the context menu labels according to whether the selected item
     * is a solution or a normal snapshot.
     *
     * This is purely cosmetic – the behavior is always:
     *  - Load position on board
     *  - Copy LURD to clipboard
     *  - Delete snapshot/solution
     */
    private updateContextMenuLabels(): void {
        if (!this.contextMenuSnapshot) {
            return
        }

        const isSolution = this.contextMenuSnapshot instanceof Solution

        const setItem    = document.getElementById("contextSetSnapshot")
        const copyItem   = document.getElementById("contextCopySnapshot")
        const deleteItem = document.getElementById("contextDeleteSnapshot")

        if (setItem) {
            setItem.innerHTML = `<i class="play icon"></i> ${
                isSolution ? "Load solution on board" : "Load snapshot on board"
            }`
        }
        if (copyItem) {
            copyItem.innerHTML = `<i class="copy icon"></i> ${
                isSolution ? "Copy solution to clipboard" : "Copy snapshot to clipboard"
            }`
        }
        if (deleteItem) {
            deleteItem.innerHTML = `<i class="trash icon"></i> ${
                isSolution ? "Delete solution" : "Delete snapshot"
            }`
        }
    }

    /** Closes the snapshot/solution context menu. */
    private closeSnapshotContextMenu(): void {
        if (!this.snapshotContextMenu) return
        this.snapshotContextMenu.style.display = "none"
        this.contextMenuSnapshot = null
    }
}