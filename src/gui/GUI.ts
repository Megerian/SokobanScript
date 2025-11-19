import {Board, REACHABLE_BOX, REACHABLE_PLAYER} from "../board/Board"
import {NONE, SokobanApp} from "../app/SokobanApp"
import {CommonSkinFormatBase, SKIN_NAME, SpriteData} from "../skins/commonSkinFormat/CommonSkinFormatBase"
import {XSB_BACKGROUND, XSB_WALL} from "../Sokoban/LevelFormat"
import {Utilities} from "../Utilities/Utilities"
import {Settings} from "../app/Settings"
import {Snapshot} from "../Sokoban/domainObjects/Snapshot"
import {LevelCollectionIO} from "../services/LevelCollectionIO"
import {Collection} from "../Sokoban/domainObjects/Collection"
import {Level} from "../Sokoban/domainObjects/Level"
import {DIRECTION, Directions, UP} from "../Sokoban/Directions"
import {NightShift3Skin} from "../skins/commonSkinFormat/NighShift3Skin"
import {SkinLoader} from "../skins/SkinLoader";
import {Solution} from "../Sokoban/domainObjects/Solution"


export const enum Action {  // actions (with strings for easier debugging -))
    levelSelected = "levelSelected",
    collectionSelected = "collectionSelected",
    toggleSnapshotList = "toggleSnapshotList",
    howToPlay = "howToPlay",
    undoAll ="undoAll",
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
    importLevelFromClipboard = "importLevelFromClipboard",
    copyLevelToClipboard = "copyLevelToClipboard",
    importLURDString = "importLURDString",
    saveSnapshot = "saveSnapshot",
    toggleDeleteSnapshotMode = "toggleDeleteSnapshotMode",

    cellClicked = "cellClicked",
}

export class GUI {

    movesText    = document.getElementById('moves')      as HTMLSpanElement
    pushesText   = document.getElementById('pushes')     as HTMLSpanElement
    boardDisplay = document.getElementById('grid')       as HTMLElement
    debugText    = document.getElementById('debugText' ) as HTMLElement

    /**
     * View menu
     * The settings that are selectors have the settings stored in the data attributes.
     */
    skinItems                         = document.querySelectorAll("[data-skinName]")
    graphicSizeSelectorItems          = document.querySelectorAll("[data-skinGraphicSize]")
    moveAnimationDelayItems           = document.querySelectorAll("[data-moveAnimationDelay]")
    selectedObjectAnimationDelayItems = document.querySelectorAll("[data-selectedObjectAnimationDelay]")
    showAnimationsCheckbox            = document.getElementById("showAnimations") as HTMLInputElement

    /** Settings menu */

    // Sound
    soundEnabledCheckbox = document.getElementById("soundEnabled")      as HTMLInputElement

    // Background
    backgroundColor           = document.getElementById("backgroundColor")           as HTMLInputElement
    setDefaultBackgroundColor = document.getElementById("setDefaultBackgroundColor") as HTMLInputElement
    setDropsBackgroundImage = document.getElementById("setDropsBackgroundImage")     as HTMLButtonElement



    /** Toolbar elements */
    undoAllButton            = document.getElementById("undoAllButton")            as HTMLButtonElement
    undoButton               = document.getElementById("undoButton")               as HTMLButtonElement
    redoButton               = document.getElementById("redoButton")               as HTMLButtonElement
    redoAllButton            = document.getElementById("redoAllButton")            as HTMLButtonElement
    hideWallsCheckbox        = document.getElementById("hideWalls")                as HTMLInputElement
    copyMovesAsString        = document.getElementById("copyMovesAsString")        as HTMLInputElement
    pasteMovesFromClipboard  = document.getElementById("pasteMovesFromClipboard")  as HTMLInputElement
    importLevelFromClipboard = document.getElementById("importLevelFromClipboard") as HTMLInputElement
    exportLevelFromClipboard = document.getElementById("exportLevelFromClipboard") as HTMLInputElement
    importLevelFromFile        = document.getElementById("importLevelFromFile")      as HTMLDivElement;
    levelFileInput            = document.getElementById("levelFileInput")           as HTMLInputElement;
    howToPlayMenuItem         = document.getElementById("howToPlay")                as HTMLInputElement

    /** Status bar */
    statusTextLabel = document.getElementById("statusTextLabel") as HTMLLabelElement
    statusText =   document.getElementById('statusText') as HTMLSpanElement

    // Collection and Level selectors
    collectionSelector = document.getElementById("collectionSelector") as HTMLSelectElement
    levelSelector = document.getElementById("levelSelector") as HTMLSelectElement
    private levelCollection = new Collection("", "", [])    // Currently played level collection

    // Imported collections keyed by their display name (usually the file name without extension).
    private importedCollections = new Map<string, Collection>();

    // Solutions/Snapshots list
    snapshotList = document.getElementById("snapshotList") as HTMLDivElement
    importLURDStringButton = document.getElementById("importLURDString") as HTMLButtonElement
    saveSnapshotButton = document.getElementById("saveSnapshotButton") as HTMLButtonElement
    deleteSnapshotButton = document.getElementById("deleteSnapshotButton") as HTMLButtonElement
    snapshotSidebar = document.getElementById("snapshotSidebar") as HTMLDivElement
    showSnapshotListCheckbox = document.getElementById("showSnapshotListCheckbox") as HTMLInputElement

    private isDeleteSnapshotMode = false

    toolbarButtons = document.getElementById("toolbarButtons") as HTMLDivElement  // The main div containing all elements

    private canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement
    private ctx = this.canvas.getContext('2d')!

    private isShowPlayerSelectedAnimationActivated = false
    private isShowBoxSelectedAnimationActivated    = false
    private selectedObjectAnimationCount = 0                 // Only one animation must be played at a time. Hence, a new number is set when a new animation is started
    private boxPositionAnAnimationIsShownFor: number = NONE  // position of the box to show a selected animation for

    clickedPosition: number = NONE      // Position on the board that has been clicked
    clickedXCoordinate: number = -1     // x-coordinate of the mouse event
    clickedYCoordinate: number = -1     // y-coordinate of the mouse event

    private board = Board.getDummyBoard()   // the board that is used in the SokobanApp class/the model

    private skin: CommonSkinFormatBase = new NightShift3Skin()

    private graphicDisplaySize = 44     // width and height of the graphics ON THE SCREEN

    static isModalDialogShown = false   // Static flag indicating whether any normal actions should not fire

    constructor(private readonly app: SokobanApp) {
        this.addListeners()

        document.body.style.overflow = 'hidden' // avoid scrolling of the window when the mouse wheel is used

        this.ctx.imageSmoothingQuality = "high"

        this.adjustCanvasSize()                 // Set canvas size to fit the window size
    }

    /** Sets the GUI elements according to the current settings. */
    async setCurrentSettings() {

        // Skin
        this.skinItems.forEach(item => {
            item.classList.remove("selected", "active")
            if(item.getAttribute("data-skinName") == Settings.skinName) {
                item.classList.add("active", "selected")
            }
        })

        // Skin graphic size
        this.graphicSizeSelectorItems.forEach(item => {
            item.classList.remove("selected", "active")

            if(item.getAttribute("data-skinGraphicSize") == Settings.graphicSize) {
                item.classList.add("active", "selected")
            }
        })

        // Move animation delay
        this.moveAnimationDelayItems.forEach(item => {
            item.classList.remove("selected", "active")

            if(item.getAttribute("data-moveAnimationDelay") == Settings.moveAnimationDelayMs.toString()) {
                item.classList.add("active", "selected")
            }
        })

        // Selected object animation delay
        this.selectedObjectAnimationDelayItems.forEach(item => {
            item.classList.remove("selected", "active")

            if(item.getAttribute("data-selectedObjectAnimationDelay") == Settings.selectedObjectAnimationsSpeedPercent.toString()) {
                item.classList.add("active", "selected")
            }
        })

        this.showAnimationsCheckbox.checked = Settings.showAnimationFlag
        this.hideWallsCheckbox.checked      = Settings.hideWallsFlag
        this.soundEnabledCheckbox.checked   = Settings.soundEnabled
        this.backgroundColor.value          = Settings.backgroundColor

        await this.setSkin(Settings.skinName)

        if(Settings.backgroundImageName.length > 0) {
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

        // Start the animation again with the new skin graphics.
        this.restartAnimations()
    }

    newLevelLoaded() {
        this.board = this.app.board // for easier access save a direct reference to the board in the model

        this.adjustNewGraphicSize()
        this.updateCanvas()
    }

    private canvasMouseDown(event: MouseEvent) {
        this.clickedXCoordinate = event.x
        this.clickedYCoordinate = event.y

        this.clickedPosition =  this.convertScreenCoordinatesToBoardPosition(event.x, event.y) // the app can query this variable
        if(this.clickedPosition != NONE) {
            this.doAction(Action.cellClicked)
        }
    }
    private canvasMouseUp(event: MouseEvent) {

        if( Math.abs(event.x - this.clickedXCoordinate) < 5 && Math.abs(event.y -this.clickedYCoordinate) < 5) {    // mouse down was a single "click" when it's within 5 pixels
            return
        }

        this.clickedPosition =  this.convertScreenCoordinatesToBoardPosition(event.x, event.y) // the app can query this variable
        if(this.clickedPosition != NONE) {
            this.doAction(Action.cellClicked)
        }
    }

    /**
     * Returns the board position for the passed x and y coordinates of the canvas
     * or NONE in case it's not a valid board position.
     *
     * Note:
     * for supporting the Firefox browser, the canvas isn't resized to the actual
     * board size but stays as it is even when the displayed board is smaller
     * than the canvas.
     * Hence, clicking the canvas can result in invalid board positions.
     */
    private convertScreenCoordinatesToBoardPosition(x: number, y: number): number {

        const rect = this.canvas.getBoundingClientRect()
        const canvasX = x - rect.left
        const canvasY = y - rect.top

        const cellX = Math.floor(canvasX / this.graphicDisplaySize)
        const cellY = Math.floor(canvasY / this.graphicDisplaySize)

        const boardPosition = cellY * this.board.width + cellX

        const isLegalBoardPosition = cellX >= 0 && cellX < this.board.width  &&
                                     cellY >= 0 && cellY < this.board.height

        return isLegalBoardPosition ? boardPosition : NONE


    }

    updateCanvas(): void {
        this.updateCanvasForPositions(...this.board.positions)
    }

    /**
     * Sets the correct images in the displayed grid for the given positions.
     */
    updateCanvasForPositions(...positions: number[]): void {

        for(const position of positions) {
            let boardElement = this.board.getXSB_Char(position)

            if(boardElement === XSB_BACKGROUND) {
                continue
            }

            const {outputX, outputY} = this.getCanvasCoordinatesForPosition(position)

            if(boardElement == XSB_WALL && Settings.hideWallsFlag) {
                this.ctx.clearRect(outputX, outputY, this.graphicDisplaySize, this.graphicDisplaySize)
                continue
            }

            const playerViewDirection = this.getPlayerViewDirection()

            const spriteData = this.skin.getSprite(this.board, position, playerViewDirection)
            this.drawSprite(spriteData, outputX, outputY)

            const isReachable = this.board.reachableMarker[position]
            if(isReachable == REACHABLE_PLAYER || isReachable == REACHABLE_BOX) {
                this.drawReachableGraphic(outputX, outputY)
            }
        }

        this.showAnimations()
    }

    private showAnimations() {

        if(this.skin.playerSelectedAnimationSprites.length == 0) {
            return  // skin doesn't support showing animations
        }

        if(this.isShowBoxSelectedAnimationActivated && this.boxPositionAnAnimationIsShownFor != this.app.selectedBoxPosition) {
            this.isShowBoxSelectedAnimationActivated = false
        }

        if(Settings.showAnimationFlag) {

            /** Coding for showing the player animation */
            if (this.app.isPlayerSelected && !this.isShowPlayerSelectedAnimationActivated) {
                this.showPlayerSelectedAnimation()
            }

            /** Coding for showing box animation */
            if (this.app.selectedBoxPosition != NONE && !this.isShowBoxSelectedAnimationActivated) {
                this.showBoxSelectedAnimation()
            }
        }

        if(this.app.selectedBoxPosition == NONE && this.isShowBoxSelectedAnimationActivated) {
            this.isShowBoxSelectedAnimationActivated = false
        }
        if(!this.app.isPlayerSelected && this.isShowPlayerSelectedAnimationActivated) {
            this.isShowPlayerSelectedAnimationActivated = false
        }
    }

    private showBoxSelectedAnimation() {
        const animationGraphics = this.board.isGoal(this.app.selectedBoxPosition) ? this.skin.boxOnGoalSelectedAnimationSprites : this.skin.boxSelectedAnimationSprites

        const drawNextAnimationGraphic = this.getDrawAnimationGraphicsAtPositionFunction(animationGraphics, this.app.selectedBoxPosition)

        this.isShowBoxSelectedAnimationActivated = true

        // When for instance the skin is switched, the old animation has to stop and the new one is started with the new graphics.
        const animationTimestamp = ++this.selectedObjectAnimationCount
        const isAnimationActive = () => this.isShowBoxSelectedAnimationActivated && animationTimestamp == this.selectedObjectAnimationCount

        let previousTimestamp = 0

        function drawGraphicLoop(timestamp: DOMHighResTimeStamp) {

            let elapsedInMs = timestamp - previousTimestamp;

            const currentAnimationDelayInMs = 1000 / animationGraphics.length / Settings.selectedObjectAnimationsSpeedPercent * 100 // 1 animation per second is the default

            if(isAnimationActive()) {
                if (elapsedInMs >= currentAnimationDelayInMs) {
                    drawNextAnimationGraphic()
                    previousTimestamp = timestamp
                }
                requestAnimationFrame(drawGraphicLoop)
            }
        }

        requestAnimationFrame(drawGraphicLoop)
    }

    private showPlayerSelectedAnimation() {
        const animationGraphics = this.board.isGoal(this.board.playerPosition) ? this.skin.playerOnGoalSelectedAnimationSprites : this.skin.playerSelectedAnimationSprites

        const drawNextAnimationGraphic = this.getDrawAnimationGraphicsAtPositionFunction(animationGraphics, this.board.playerPosition)

        this.isShowPlayerSelectedAnimationActivated = true

        // When for instance the skin is switched the old animation has to stop and the new one is started with the new graphics.
        const animationTimestamp = ++this.selectedObjectAnimationCount
        const isAnimationActive = () => this.isShowPlayerSelectedAnimationActivated && animationTimestamp == this.selectedObjectAnimationCount

        let previousTimestamp = 0

        function drawGraphicLoop(timestamp: DOMHighResTimeStamp) {

            let elapsedInMs = timestamp - previousTimestamp;

            const currentAnimationDelayInMs = 1000 / animationGraphics.length / Settings.selectedObjectAnimationsSpeedPercent * 100 // 1 animation per second is the default

            if(isAnimationActive()) {
                if (elapsedInMs >= currentAnimationDelayInMs) {
                    drawNextAnimationGraphic()
                    previousTimestamp = timestamp
                }
                requestAnimationFrame(drawGraphicLoop)
            }
        }

        requestAnimationFrame(drawGraphicLoop)
    }

    private getDrawAnimationGraphicsAtPositionFunction(graphics: Array<SpriteData>, position: number): () => void {

        const {outputX, outputY} = this.getCanvasCoordinatesForPosition(position)
        const animationGraphics = graphics

        let graphicIndex = 0

        return () => {
            this.drawSprite(animationGraphics[graphicIndex], outputX, outputY)
            graphicIndex = (graphicIndex + 1) % animationGraphics.length
        }
    }

    /** Returns the x and y coordinates of the given board position on the canvas. */
    private getCanvasCoordinatesForPosition(position: number): {outputX: number, outputY: number} {
       const {x, y} = this.getXYCoordinatesOf(position)
       return {
           outputX: x * this.graphicDisplaySize,
           outputY: y * this.graphicDisplaySize
       }
    }

    private getPlayerViewDirection(): DIRECTION {
        const lastPlayedMoveDirection = this.app.moveHistory.getLastDoneMoveDirection()

        // If a move has been made take the direction of the last move as view direction.
        if(lastPlayedMoveDirection != null) {
            return lastPlayedMoveDirection
        }

        // If there is an undone move take the direction of that move.
        const nextMoveLURDChar = this.app.moveHistory.getNextMoveLURDChar()
        if(nextMoveLURDChar != null) {
            return Directions.getDirectionFromLURDChar(nextMoveLURDChar)
        }

        // Don't let the player look at a wall.
        for(const direction of Directions.DIRECTIONS) {
            const neighborPosition = this.board.getNeighborPosition(this.board.playerPosition, direction)
            if (!this.board.isWall(neighborPosition)) {
                return direction
            }
        }

        return UP
    }

    private drawSprite(imageData: SpriteData, outputX: number, outputY: number) {

        const imageSize = this.skin.getImageSize()
        const scaleFactor = this.graphicDisplaySize / imageSize
        const scaledOutputWidth  = scaleFactor * imageSize
        const scaledOutputHeight = scaleFactor * imageSize

        this.ctx.drawImage(imageData.image, outputX, outputY, scaledOutputWidth, scaledOutputHeight)

        if (imageData.beautyGraphic != null) {
            const beautyGraphic = imageData.beautyGraphic
            this.ctx.drawImage(beautyGraphic.image,
                outputX + scaleFactor*beautyGraphic.xDrawOffset, outputY + scaleFactor*beautyGraphic.yDrawOffset,
                scaledOutputWidth, scaledOutputHeight)
        }

        imageData.rectanglesToClear.forEach(rectangle =>
            this.ctx.clearRect(outputX + rectangle.x*scaleFactor, outputY + rectangle.y*scaleFactor,
                rectangle.width*scaleFactor, rectangle.height*scaleFactor)
        )
    }

    /** Draws the reachable graphic at the [outputX]/[outputY]. */
    private drawReachableGraphic(outputX: number, outputY: number) {
        const circleX = outputX + Math.round(this.graphicDisplaySize / 2)
        const circleY = outputY + Math.round(this.graphicDisplaySize / 2)

        const radius = Math.floor(this.graphicDisplaySize * 0.15)
        this.ctx.beginPath()
        this.ctx.arc(circleX, circleY, radius, 0, 2 * Math.PI)
        this.ctx.fillStyle = Settings.reachablePositionColor
        this.ctx.fill()

        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)'
        this.ctx.arc(circleX, circleY, radius, 0, 2 * Math.PI)
        this.ctx.stroke()
    }

    setStatusText(text: string): void  {
        this.statusTextLabel.classList.remove("hidden")
        this.statusText.textContent = text
    }

    showLevelSolvedAnimation() {
        document.getElementById("levelSolvedDiv")!.style.visibility = ""
        this.canvas.classList.add('animating', 'transition', 'tada')    // Tada animation
        setTimeout( () => {
            this.canvas.classList.remove('animating', 'transition', 'tada')
            document.getElementById("levelSolvedDiv")!.style.visibility = "hidden"
        }, 1500)
    }

    private getXYCoordinatesOf(position: number): {x: number, y: number} {
        return {
            x: position%this.board.width,
            y: Math.floor(position/this.board.width)
        }
    }

    private addListeners() {

        document.addEventListener("keydown", (event) => {

            if(event.shiftKey || event.ctrlKey       // we just handle normal keys
                || GUI.isModalDialogShown) {         // as long as a dialog is shown all input events are handled by that dialog
                return
            }

            switch(event.key) {

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

        this.canvas.addEventListener("mousedown", (event) => this.canvasMouseDown(event))
        this.canvas.addEventListener("mouseup", (event) => this.canvasMouseUp(event))

        document.addEventListener("wheel", (event) => this.mouseScroll(event))

        // Listeners for changing the skin for representing the level.
        this.skinItems.forEach(skinItem => {
            skinItem.addEventListener("click", (e: Event) => {
                this.skinItems.forEach( skinItem => skinItem.classList.remove("selected", "active") )
                skinItem.classList.add("active", "selected")

                const selectedSkinName = skinItem?.getAttribute("data-skinName") as SKIN_NAME
                if(selectedSkinName != null) {
                    this.setSkin(selectedSkinName).then(() => this.updateCanvas())
                }
            })
        })

        // Listener for changing the skin graphic size.
        this.graphicSizeSelectorItems.forEach(graphicSizeItem => {
            graphicSizeItem.addEventListener("click", (e: Event) => {
                this.graphicSizeSelectorItems.forEach( item => item.classList.remove("selected", "active") )
                graphicSizeItem.classList.add("active", "selected")

                const selectedGraphicSize = graphicSizeItem?.getAttribute("data-skinGraphicSize")
                if(selectedGraphicSize != null) {
                    this.setNewGraphicSize(selectedGraphicSize)
                }
            })
        })


        // Listener for changing the move animation delay.
        this.moveAnimationDelayItems.forEach(moveDelayItem => {
            moveDelayItem.addEventListener("click", (e: Event) => {
                this.moveAnimationDelayItems.forEach( item => item.classList.remove("selected", "active") )
                moveDelayItem.classList.add("active", "selected")

                const moveAnimationDelay = moveDelayItem?.getAttribute("data-moveAnimationDelay")
                if(moveAnimationDelay != null) {
                    Settings.moveAnimationDelayMs = +moveAnimationDelay
                }
            })
        })

        // Listener for changing the selected object animation delay.
        this.selectedObjectAnimationDelayItems.forEach(selectedObjectAnimationDelayItem => {
            selectedObjectAnimationDelayItem.addEventListener("click", (e: Event) => {
                this.selectedObjectAnimationDelayItems.forEach( item => item.classList.remove("selected", "active") )
                selectedObjectAnimationDelayItem.classList.add("active", "selected")

                const animationDelay = selectedObjectAnimationDelayItem?.getAttribute("data-selectedObjectAnimationDelay")
                if(animationDelay != null) {
                    Settings.selectedObjectAnimationsSpeedPercent = +animationDelay
                }
            })
        })

        // Open the file picker when "Import level from file" is clicked.
        if (this.importLevelFromFile && this.levelFileInput) {
            this.importLevelFromFile.addEventListener("click", () => {
                this.levelFileInput.click()
            })

            this.levelFileInput.addEventListener("change", async () => {
                const file = this.levelFileInput.files && this.levelFileInput.files[0]
                if (!file) {
                    return
                }

                try {
                    const text = await file.text()

                    const levels = LevelCollectionIO.parseLevelCollectionLevels(text)
                    if (!levels || levels.length === 0) {
                        alert("No Sokoban levels were found in the selected file.")
                        return
                    }

                    const fileName = file.name || "Imported collection"
                    const baseName = fileName.replace(/\.[^/.]+$/, "") // remove extension

                    const importedCollection = new Collection(baseName, "", levels)

                    // Store for later selection.
                    this.importedCollections.set(baseName, importedCollection)

                    // Ensure an option exists in the collection selector.
                    let existingOption = Array.from(this.collectionSelector.options)
                        .find(option => option.value === baseName)

                    if (!existingOption) {
                        const option = document.createElement("option")
                        option.value = baseName
                        option.text = baseName
                        this.collectionSelector.add(option)
                        existingOption = option
                    }

                    // Select this imported collection.
                    this.collectionSelector.value = baseName

                    // Tell the app about the current collection name.
                    this.app.setCurrentCollectionName(baseName)

                    // Show levels and load the first one.
                    this.setCollectionForPlaying(importedCollection)
                    this.levelSelector.selectedIndex = 0
                    this.newLevelSelected()
                } catch (error) {
                    console.error("Failed to read or parse level file", error)
                    alert("Could not read the selected file or parse it as a Sokoban collection.")
                } finally {
                    this.levelFileInput.value = ""
                }
            })
        }

        this.saveSnapshotButton.addEventListener("click", (e: Event) =>
            this.doAction(Action.saveSnapshot)
        )

        window.addEventListener("resize", (e: Event) => {
            this.adjustCanvasSize()
            this.adjustNewGraphicSize()
            this.updateCanvas()
        })

        this.undoAllButton            .addEventListener("click", (e: Event) => this.doAction(Action.undoAll))
        this.undoButton               .addEventListener("click", (e: Event) => this.doAction(Action.undo))
        this.redoButton               .addEventListener("click", (e: Event) => this.doAction(Action.redo))
        this.redoAllButton            .addEventListener("click", (e: Event) => this.doAction(Action.redoAll))
        this.hideWallsCheckbox        .addEventListener("change", (e: Event) => this.doAction(Action.hideWalls))
        this.soundEnabledCheckbox     .addEventListener("change", (e: Event) => this.doAction(Action.toggleSoundEnabled))
        this.backgroundColor          .addEventListener("input", (e: Event) => this.doAction(Action.setBackgroundColor))
        this.setDefaultBackgroundColor.addEventListener("click", (e: Event) => this.doAction(Action.setDefaultBackgroundColor))
        this.setDropsBackgroundImage  .addEventListener("click", (e: Event) => this.doAction(Action.setDropsBackgroundImage))
        this.showAnimationsCheckbox   .addEventListener("change", (e: Event) => this.doAction(Action.showAnimationsCheckbox))
        this.copyMovesAsString        .addEventListener("click", (e: Event) => this.doAction(Action.copyMovesAsString))
        this.pasteMovesFromClipboard  .addEventListener("click", (e: Event) => this.doAction(Action.pasteMovesFromClipboard))
        this.importLevelFromClipboard .addEventListener("click", (e: Event) => this.doAction(Action.importLevelFromClipboard))
        this.exportLevelFromClipboard .addEventListener("click", (e: Event) => this.doAction(Action.copyLevelToClipboard))

        this.howToPlayMenuItem        .addEventListener("click", (e: Event) => this.doAction(Action.howToPlay))
        this.importLURDStringButton   .addEventListener("click", (e: Event) => this.doAction(Action.importLURDString))
        this.deleteSnapshotButton     .addEventListener("click", (e: Event) => this.doAction(Action.toggleDeleteSnapshotMode))
        this.showSnapshotListCheckbox .addEventListener("change", (e: Event) => this.doAction(Action.toggleSnapshotList))
        this.collectionSelector       .addEventListener("change", (e: Event) => this.doAction(Action.collectionSelected))
        this.levelSelector            .addEventListener("change", (e: Event) => this.doAction(Action.levelSelected))
    }

    /** Sets the graphic size to the user selected value. */
    private adjustNewGraphicSize(): void {

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        const newGraphicSize = Settings.graphicSize === 'auto' ?     // automatic graphic size calculation
            this.getMaximalGraphicSize() : +Settings.graphicSize

        this.graphicDisplaySize = newGraphicSize

        // Ensure the main div is centered in the middle of the board display.
        this.toolbarButtons.style.width = (this.board.width * newGraphicSize) + "px"
    }

    /**
     * Returns the maximum graphic size so the canvas can fully be displayed.
     */
    private getMaximalGraphicSize(): number {

        const maxWidth = Math.floor(this.canvas.width / this.board.width)
        const maxHeight = Math.floor(this.canvas.height / this.board.height)
        const maxGraphicSizeForWindow = Math.min(maxWidth, maxHeight)

        const MINIMUM_GRAPHIC_SIZE = 16 // constants for reasonable graphic size limits
        const MAXIMUM_GRAPHIC_SIZE = Math.min(64, this.skin.getImageSize()) // don't scale images too much so 64 is maximum

        const maxGraphicSize = Utilities.coerceIn(maxGraphicSizeForWindow, MINIMUM_GRAPHIC_SIZE, MAXIMUM_GRAPHIC_SIZE)

        return maxGraphicSize
    }


    /** Sets maximal size for the canvas so it fits into the window. */
    private adjustCanvasSize() {
        const canvasRect = this.canvas.getBoundingClientRect()

        const MARGIN = 32   // left and right is handled by the padding of the enclosing div, but not right and bottom

        const availableHorizontalSize = window.innerWidth  - canvasRect.left - MARGIN
        const availableVerticalSize   = window.innerHeight - canvasRect.top  - MARGIN

        this.canvas.width  = availableHorizontalSize
        this.canvas.height = availableVerticalSize
    }

    private mouseScroll(event: WheelEvent) {
        if(event.deltaY < 0) {
            this.doAction(Action.redo)
        }
        if(event.deltaY > 0) {
            this.doAction(Action.undo)
        }

        event.stopPropagation()
    }

    /** Show an info about how to use this app. */
    private showHowToPlay() {
        ($("#showHowToPlay") as any).modal({
            onShow: () => { GUI.isModalDialogShown = true },    // tell the GUI listeners that we
            onHidden: () => { GUI.isModalDialogShown = false }  // handle input events
        }).modal('show')
    }

    /** Shows the snapshot list in the GUI. */
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

    /** Toggles the delete mode for snapshots/solutions. */
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

    /**
     * Called when the user has selected another level collection to be played.
     * The first level of the new level collection is loaded so the user can play it.
     */
    private newCollectionSelected() {

        const levelCollectionName = this.collectionSelector.value

        // First, check if this is an imported collection loaded from a local file.
        const importedCollection = this.importedCollections.get(levelCollectionName)
        if (importedCollection) {
            this.setCollectionForPlaying(importedCollection)
            this.app.setCurrentCollectionName(levelCollectionName)
            this.newLevelSelected()   // Set the first level for playing
            return
        }

        if (levelCollectionName.includes("#")) {              // user level via URL
            this.setUserLevelForPlaying(levelCollectionName)
            return
        }

        Settings.lastPlayedCollectionName = levelCollectionName

        const collectionPromise = LevelCollectionIO.loadLevelCollection(`resources/levels/${levelCollectionName}`)
        collectionPromise.then(levelCollection => {
            this.setCollectionForPlaying(levelCollection)
            this.app.setCurrentCollectionName(levelCollectionName)
            this.newLevelSelected()   // Set the first level for playing
        })
    }

    /**
     * When the user has passed a level via URL parameter an extra item is in the selector.
     * However, the user shouldn't be able to select this item once another item has been
     * selected since the level can be loaded again then.
     */
    private setUserLevelForPlaying(boardAsString: string) {

        const board = Board.createFromString(boardAsString)
        if (typeof board !== 'string') {
            const level = new Level(board)
            level.title = "Level 1"
            const collection = new Collection("", "", [level])
            this.setCollectionForPlaying(collection)
            this.newLevelSelected()   // Set the first level for playing
        }
    }

    private setCollectionForPlaying(collection: Collection) {
        this.levelCollection = collection

        while(this.levelSelector.options.length > 0) {
            this.levelSelector.options.remove(0)
        }

        for(const level of collection.levels) {
            const levelItem = document.createElement('option')
            levelItem.value     = level.levelNumber.toString()
            levelItem.innerText = level.levelNumber + " - " + level.title
            this.levelSelector.appendChild(levelItem)
        }
    }

    /**
     * Set the selected level for playing.
     */
    private newLevelSelected() {
        const levelNumber = parseInt(this.levelSelector.value.split(" - ").pop() ?? "1")
        this.app.setLevelForPlaying(this.levelCollection.levels[levelNumber-1])
    }

    /** Removes all snapshot/solution items from the sidebar list. */
    clearSnapshotList(): void {
        const items = this.snapshotList.querySelectorAll(".item")
        items.forEach(item => item.remove())
    }

    /** Adds the given snapshot or solution to the sidebar list. */
    updateSnapshotList(snapshot: Snapshot) {

        const isSolution = snapshot instanceof Solution
        const cssClass = isSolution ? "solution" : "snapshot"

        const snapshotItem = document.createElement("div")
        snapshotItem.classList.add("item", cssClass)
        snapshotItem.id = "snapshot" + snapshot.uniqueID

        // Fomantic-style: icon + content (header + description)
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

        // NEW: delete icon (X) on the right side
        const deleteIcon = document.createElement("i")
        deleteIcon.classList.add("close", "icon", "snapshot-delete-icon")

        // Clicking the delete icon should NOT trigger the double-click load.
        deleteIcon.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation()
            this.app.deleteSnapshot(snapshot)
        })

        snapshotItem.appendChild(icon)
        snapshotItem.appendChild(contentDiv)
        snapshotItem.appendChild(deleteIcon)

        // Double-click restores this snapshot / solution on the board.
        snapshotItem.addEventListener("dblclick", () => {
            this.app.setSnapshot(snapshot)
        })

        this.snapshotList.appendChild(snapshotItem)

        ;($('#' + snapshotItem.id) as any).transition("jiggle", "0.5s")
    }

    /** Removes the given snapshot/solution item from the sidebar list. */
    removeSnapshotFromList(snapshot: Snapshot): void {
        const item = document.getElementById("snapshot" + snapshot.uniqueID)
        if (item) {
            item.remove()
        }
    }

    /**
     * Handles an action that is to be performed.
     * If this GUI can't perform the given action it is
     * passed to the app to be performed there.
     *
     * @param action  the action to perform
     */
    private doAction(action: Action) {

        switch(action) {
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

            case Action.levelSelected:
                this.newLevelSelected()
                break

            case Action.showAnimationsCheckbox:
                Settings.showAnimationFlag = this.showAnimationsCheckbox.checked
                this.restartAnimations()
                this.showAnimations()
                this.updateCanvas()
                break

            default:
                this.app.doAction(action)      // GUI can't handle it => pass to app
        }
    }

    /** Toggles the snapshot list visibility and stores the setting. */
    private toggleSnapshotList(): void {
        // Flip the stored flag (this works for both checkbox + keyboard)
        const newValue = !Settings.showSnapshotListFlag
        Settings.showSnapshotListFlag = newValue

        // Keep the checkbox in sync
        this.showSnapshotListCheckbox.checked = newValue

        // Show or hide the sidebar
        GUI.setSnapshotListVisible(newValue)
    }


    /**
     * If any animations are shown, stop and restart them so they
     * immediately use the new delay values and new skin graphics.
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

    /** Sets a new graphic size for displaying the level. */
    private setNewGraphicSize(selectedGraphicSize: string) {
        Settings.graphicSize = selectedGraphicSize
        this.adjustNewGraphicSize()
        this.restartAnimations()    // stop any running animations
        this.showAnimations()       // start the animations again
        this.updateCanvas()
    }

    /** Sets the passed new background color in the GUI. */
    private static setNewBackgroundColor(backgroundColor: string) {
        Settings.backgroundColor = backgroundColor
        Settings.backgroundImageName = ""
        document.body.setAttribute('style',
            `background-color: ${backgroundColor} !important; ` +
                  'overflow: hidden;')   // keep the setting for not showing the scrollbars
    }

    /** Set the passed background image as new background. */
    private static setBackgroundImage(imageFileName: string) {
       Settings.backgroundImageName = imageFileName
       document.body.setAttribute('style',
           `background-image: url(/resources/backgroundImages/${imageFileName});` +
                 'background-size: 100% 100%;' +
                 'overflow: hidden;')   // keep the setting for not showing the scrollbars
    }
}
