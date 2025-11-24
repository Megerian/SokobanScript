// Responsible only for drawing the Sokoban board on a <canvas> element.
// It knows:
//   - the current Board (width / height / contents)
//   - the current skin (sprite sheet + reachability markers)
//   - selection state (player / selected box) and animation settings
//
// It does NOT know anything about SokobanApp, move history, etc.
// The surrounding GUI / controller passes in all dynamic state
// via method parameters (SelectionState, playerDirection, ...).

import { Board, REACHABLE_BOX, REACHABLE_PLAYER } from "../board/Board"
import { CommonSkinFormatBase, SpriteData } from "../skins/commonSkinFormat/CommonSkinFormatBase"
import { XSB_BACKGROUND, XSB_WALL } from "../Sokoban/PuzzleFormat"
import { Settings } from "../app/Settings"
import { Utilities } from "../Utilities/Utilities"
import { DIRECTION, Directions, UP } from "../Sokoban/Directions"

/**
 * UI-level selection state.
 *
 * Conventions:
 *  - selectedBoxPosition === -1  → no box is currently selected
 *  - isPlayerSelected === true   → player selection animation should be active
 */
export interface SelectionState {
    selectedBoxPosition: number
    isPlayerSelected: boolean
}

export class BoardRenderer {

    /** 2D drawing context of the canvas */
    private ctx: CanvasRenderingContext2D

    /**
     * Size (in pixels) of one logical board cell when rendered on the canvas.
     * This is computed from:
     *  - current window / canvas size
     *  - current board width / height
     *  - Settings.graphicSize (auto or fixed)
     */
    private graphicDisplaySize = 44

    // ---------------------------------------------------------------------
    // Selection animation state
    // ---------------------------------------------------------------------

    /** Is the player selection animation currently running? */
    private isShowPlayerSelectedAnimationActivated = false

    /** Is the box selection animation currently running? */
    private isShowBoxSelectedAnimationActivated = false

    /**
     * Monotonically increasing counter used to invalidate old
     * animation loops when a new one is started (e.g. new selection).
     */
    private selectedObjectAnimationCount = 0

    /** Board position of the box whose selection animation is currently shown. */
    private boxPositionAnAnimationIsShownFor = -1

    // ---------------------------------------------------------------------
    // Construction / configuration
    // ---------------------------------------------------------------------

    /**
     * @param canvas  Canvas the board should be drawn on
     * @param board   Initial board to render (can be replaced via setBoard)
     * @param skin    Initial skin to use for drawing (can be replaced via setSkin)
     */
    constructor(
        private readonly canvas: HTMLCanvasElement,
        private board: Board,
        private skin: CommonSkinFormatBase
    ) {
        const ctx = this.canvas.getContext("2d")
        if (!ctx) {
            throw new Error("Could not get 2D context for canvas.")
        }

        this.ctx = ctx
        this.ctx.imageSmoothingQuality = "high"
    }

    /**
     * Updates the board reference (e.g. when a new puzzle is loaded).
     * Also recomputes the graphic size because board width/height changed.
     */
    setBoard(board: Board): void {
        this.board = board
        this.adjustNewGraphicSize()
    }

    /**
     * Updates the skin and recomputes sizes.
     * Also restarts animations so new sprites are used immediately.
     */
    setSkin(skin: CommonSkinFormatBase): void {
        this.skin = skin
        this.adjustNewGraphicSize()
        this.restartAnimations()
    }

    /**
     * Resizes the canvas so it fits into the window,
     * leaving a fixed margin around it.
     *
     * This does NOT redraw the board; the caller should
     * call adjustNewGraphicSize() + updateCanvas() afterwards.
     */
    adjustCanvasSize(): void {
        const canvasRect = this.canvas.getBoundingClientRect()
        const MARGIN = 32

        const availableHorizontalSize = window.innerWidth  - canvasRect.left - MARGIN
        const availableVerticalSize   = window.innerHeight - canvasRect.top  - MARGIN

        this.canvas.width  = availableHorizontalSize
        this.canvas.height = availableVerticalSize
    }

    /**
     * Computes a new cell size (graphicDisplaySize) based on:
     *  - current canvas size
     *  - board width / height
     *  - Settings.graphicSize ("auto" or fixed pixel size)
     *
     * Clears the canvas but does NOT redraw the board.
     */
    adjustNewGraphicSize(): void {

        // Clear current canvas content so we do not see stale graphics
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        const maxSizeByWindow = this.getMaximalGraphicSize()

        const requestedSize = Settings.graphicSize === "auto"
            ? maxSizeByWindow        // let window size decide
            : +Settings.graphicSize  // fixed size from settings

        // Final size: never larger than what fits into the canvas
        const newGraphicSize = Math.min(requestedSize, maxSizeByWindow)
        this.graphicDisplaySize = newGraphicSize
    }

    /**
     * Returns the maximum cell size that fits into the canvas
     * for the current board dimensions, clamped to a reasonable
     * [MINIMUM_GRAPHIC_SIZE, MAXIMUM_GRAPHIC_SIZE] range.
     */
    private getMaximalGraphicSize(): number {

        const maxWidth  = Math.floor(this.canvas.width  / this.board.width)
        const maxHeight = Math.floor(this.canvas.height / this.board.height)
        const maxGraphicSizeForWindow = Math.min(maxWidth, maxHeight)

        const MINIMUM_GRAPHIC_SIZE = 16
        const MAXIMUM_GRAPHIC_SIZE = Math.min(64, this.skin.getImageSize())

        return Utilities.coerceIn(
            maxGraphicSizeForWindow,
            MINIMUM_GRAPHIC_SIZE,
            MAXIMUM_GRAPHIC_SIZE
        )
    }

// ---------------------------------------------------------------------
// Layout helpers for GUI (board size in pixels)
// ---------------------------------------------------------------------

    /** Returns the current board width in pixels (used to align toolbar etc.). */
    getBoardPixelWidth(): number {
        return this.board.width * this.graphicDisplaySize;
    }

    /** Returns the current board height in pixels (for completeness). */
    getBoardPixelHeight(): number {
        return this.board.height * this.graphicDisplaySize;
    }

    // ---------------------------------------------------------------------
    // Public drawing API
    // ---------------------------------------------------------------------

    /**
     * Redraws the entire board.
     *
     * @param selectionState   current selection state of player/box
     * @param playerDirection  direction the player should face (for directional skins)
     */
    updateCanvas(selectionState: SelectionState, playerDirection: DIRECTION): void {
        this.updateCanvasForPositions(this.board.positions, selectionState, playerDirection)
    }

    /**
     * Redraws only the given positions (partial repaint).
     *
     * The caller is responsible for collecting all positions whose
     * state has changed since the last draw.
     *
     * @param positions        board positions to redraw
     * @param selectionState   current selection state of player/box
     * @param playerDirection  direction the player should face (for directional skins)
     */
    updateCanvasForPositions(
        positions: number[],
        selectionState: SelectionState,
        playerDirection: DIRECTION
    ): void {

        for (const position of positions) {
            const boardElement = this.board.getXSB_Char(position)

            // Background tiles are never drawn; they simply remain empty.
            if (boardElement === XSB_BACKGROUND) {
                continue
            }

            const { outputX, outputY } = this.getCanvasCoordinatesForPosition(position)

            // Honor "hide walls" setting by clearing tiles that contain a wall.
            if (boardElement === XSB_WALL && Settings.hideWallsFlag) {
                this.ctx.clearRect(outputX, outputY, this.graphicDisplaySize, this.graphicDisplaySize)
                continue
            }

            this.drawSprite(this.skin.getFloorSprite(), outputX, outputY)   // For skins having a transparent player/box sprite

            // Draw the main sprite for this position.
            const spriteData = this.skin.getSprite(this.board, position, playerDirection)
            this.drawSprite(spriteData, outputX, outputY)

            // Optional reachability overlay (small circle).
            const reachable = this.board.reachableMarker[position]
            if (reachable === REACHABLE_PLAYER || reachable === REACHABLE_BOX) {
                this.drawReachableGraphic(outputX, outputY)
            }
        }

        // Finally, ensure selection animations are started/stopped as needed.
        this.showAnimations(selectionState)
    }

    // ---------------------------------------------------------------------
    // Animations (selection highlighting)
    // ---------------------------------------------------------------------

    /**
     * Starts or stops selection animations for player/box as needed
     * based on the provided SelectionState.
     */
    private showAnimations(selectionState: SelectionState): void {

        // If the skin has no animation sprites, selection animations are disabled.
        if (this.skin.playerSelectedAnimationSprites.length === 0) {
            return
        }

        const { selectedBoxPosition, isPlayerSelected } = selectionState

        // Stop box animation if a different box is selected or nothing is selected.
        if (
            this.isShowBoxSelectedAnimationActivated &&
            this.boxPositionAnAnimationIsShownFor !== selectedBoxPosition
        ) {
            this.isShowBoxSelectedAnimationActivated = false
        }

        if (Settings.showAnimationFlag) {
            // Player animation
            if (isPlayerSelected && !this.isShowPlayerSelectedAnimationActivated) {
                this.showPlayerSelectedAnimation()
            }

            // Box animation
            if (selectedBoxPosition !== -1 && !this.isShowBoxSelectedAnimationActivated) {
                this.showBoxSelectedAnimation(selectedBoxPosition)
            }
        }

        // Clean up flags if selection was removed
        if (selectedBoxPosition === -1 && this.isShowBoxSelectedAnimationActivated) {
            this.isShowBoxSelectedAnimationActivated = false
        }
        if (!isPlayerSelected && this.isShowPlayerSelectedAnimationActivated) {
            this.isShowPlayerSelectedAnimationActivated = false
        }
    }

    /**
     * Shows repeated animation over the currently selected box.
     *
     * The animation runs in a requestAnimationFrame loop and
     * automatically stops when:
     *  - a different box is selected, or
     *  - the selection is cleared.
     */
    private showBoxSelectedAnimation(selectedBoxPosition: number): void {
        const animationGraphics = this.board.isGoal(selectedBoxPosition)
            ? this.skin.boxOnGoalSelectedAnimationSprites
            : this.skin.boxSelectedAnimationSprites

        const drawNextAnimationGraphic =
            this.getDrawAnimationGraphicsAtPositionFunction(animationGraphics, selectedBoxPosition)

        this.isShowBoxSelectedAnimationActivated = true
        this.boxPositionAnAnimationIsShownFor    = selectedBoxPosition

        const animationTimestamp = ++this.selectedObjectAnimationCount
        const isAnimationActive = () =>
            this.isShowBoxSelectedAnimationActivated &&
            animationTimestamp === this.selectedObjectAnimationCount

        let previousTimestamp = 0

        const drawGraphicLoop = (timestamp: DOMHighResTimeStamp) => {
            const elapsedInMs = timestamp - previousTimestamp

            // 1 animation loop per second at 100%, scaled by Settings.selectedObjectAnimationsSpeedPercent.
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
     * Shows repeated animation over the player when selected.
     * Same logic as box animation, just using player sprites.
     */
    private showPlayerSelectedAnimation(): void {
        const animationGraphics = this.board.isGoal(this.board.playerPosition)
            ? this.skin.playerOnGoalSelectedAnimationSprites
            : this.skin.playerSelectedAnimationSprites

        const drawNextAnimationGraphic =
            this.getDrawAnimationGraphicsAtPositionFunction(animationGraphics, this.board.playerPosition)

        this.isShowPlayerSelectedAnimationActivated = true

        const animationTimestamp = ++this.selectedObjectAnimationCount
        const isAnimationActive = () =>
            this.isShowPlayerSelectedAnimationActivated &&
            animationTimestamp === this.selectedObjectAnimationCount

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
     *
     * Used by the animation loops for player and box highlighting.
     */
    private getDrawAnimationGraphicsAtPositionFunction(
        graphics: Array<SpriteData>,
        position: number
    ): () => void {

        const { outputX, outputY } = this.getCanvasCoordinatesForPosition(position)
        const animationGraphics = graphics

        let graphicIndex = 0

        return () => {
            this.drawSprite(this.skin.getFloorSprite(), outputX, outputY)   // For skins having a transparent player/box sprite
            this.drawSprite(animationGraphics[graphicIndex], outputX, outputY)
            graphicIndex = (graphicIndex + 1) % animationGraphics.length
        }
    }

    /**
     * If any animations are running, stop them.
     * Call this when animation parameters or the skin change so that
     * new animations are started with the updated configuration.
     */
    restartAnimations(): void {
        if (this.isShowPlayerSelectedAnimationActivated) {
            this.isShowPlayerSelectedAnimationActivated = false
        }
        if (this.isShowBoxSelectedAnimationActivated) {
            this.isShowBoxSelectedAnimationActivated = false
        }
    }

    // ---------------------------------------------------------------------
    // Low-level drawing helpers
    // ---------------------------------------------------------------------

    /** Returns the canvas coordinates for the given board position. */
    private getCanvasCoordinatesForPosition(position: number): { outputX: number, outputY: number } {
        const { x, y } = this.getXYCoordinatesOf(position)
        return {
            outputX: x * this.graphicDisplaySize,
            outputY: y * this.graphicDisplaySize
        }
    }

    /** Returns board (x,y) coordinates for a given 1D position index. */
    private getXYCoordinatesOf(position: number): { x: number, y: number } {
        return {
            x: position % this.board.width,
            y: Math.floor(position / this.board.width)
        }
    }

    /**
     * Draws the given sprite on the canvas at the given output coordinates.
     * Handles scaling to the current graphicDisplaySize and optional
     * "beauty" overlay graphics and clear-rect areas.
     */
    private drawSprite(imageData: SpriteData, outputX: number, outputY: number): void {
        const imageSize   = this.skin.getImageSize()
        const scaleFactor = this.graphicDisplaySize / imageSize
        const scaledOutputWidth  = scaleFactor * imageSize
        const scaledOutputHeight = scaleFactor * imageSize

        // Base sprite
        this.ctx.drawImage(imageData.image, outputX, outputY, scaledOutputWidth, scaledOutputHeight)

        // Optional "beauty" overlay
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

        // Clear additional rectangles (e.g. to punch out holes in the sprite).
        imageData.rectanglesToClear.forEach(rectangle =>
            this.ctx.clearRect(
                outputX + rectangle.x * scaleFactor,
                outputY + rectangle.y * scaleFactor,
                rectangle.width * scaleFactor,
                rectangle.height * scaleFactor
            )
        )
    }

    /** Draws a small circle marking a reachable position on top of the tile. */
    private drawReachableGraphic(outputX: number, outputY: number): void {
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

    // ---------------------------------------------------------------------
    // Utility methods used by the GUI
    // ---------------------------------------------------------------------

    /**
     * Converts screen (client) coordinates to a board position index,
     * or null if the coordinates are outside the current board area.
     *
     * Typically used by the GUI for mouse click handling.
     */
    screenToBoard(clientX: number, clientY: number): number | null {
        const rect = this.canvas.getBoundingClientRect()
        const canvasX = clientX - rect.left
        const canvasY = clientY - rect.top

        const cellX = Math.floor(canvasX / this.graphicDisplaySize)
        const cellY = Math.floor(canvasY / this.graphicDisplaySize)

        const isLegal =
            cellX >= 0 && cellX < this.board.width &&
            cellY >= 0 && cellY < this.board.height

        if (!isLegal) {
            return null
        }

        return cellY * this.board.width + cellX
    }
}
