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
import { DIRECTION, UP } from "../Sokoban/Directions"

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

/**
 * Renderer responsible for drawing the board and handling
 * selection animations in a robust, time-based manner.
 *
 * Key ideas for animations:
 *  - Single requestAnimationFrame loop inside BoardRenderer.
 *  - Time-based frame selection (no "frame-per-tick" assumptions).
 *  - Robust against frame drops and GC pauses.
 *  - Board rendering remains deterministic; selection animation is
 *    drawn as a small overlay on top of the normal tiles.
 */
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

    /**
     * Last known selection state used for rendering animations.
     * The GUI passes a fresh SelectionState into updateCanvas*().
     */
    private currentSelectionState: SelectionState = {
        selectedBoxPosition: -1,
        isPlayerSelected:    false
    }

    /**
     * Last known player view direction.
     * Needed when re-drawing tiles under the animated selection overlay.
     */
    private lastPlayerDirection: DIRECTION = UP

    // ---------------------------------------------------------------------
    // Animation loop state (single RAF loop, time-based)
    // ---------------------------------------------------------------------

    /** requestAnimationFrame handle for the selection animation loop. */
    private animationFrameId: number | null = null

    /** Timestamp of the previous animation frame (for computing delta time). */
    private lastAnimationTimestamp: DOMHighResTimeStamp | null = null

    /** Accumulated animation time in milliseconds (monotonic across frames). */
    private animationTimeMs = 0

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
        return this.board.width * this.graphicDisplaySize
    }

    /** Returns the current board height in pixels (for completeness). */
    getBoardPixelHeight(): number {
        return this.board.height * this.graphicDisplaySize
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

        this.lastPlayerDirection = playerDirection

        for (const position of positions) {
            this.drawBaseTileAtPosition(position, playerDirection)
        }

        // Update internal selection-animation state and ensure that
        // the animation loop is started or stopped as required.
        this.updateSelectionAnimationState(selectionState)
    }

    // ---------------------------------------------------------------------
    // Selection animation: state management + RAF loop
    // ---------------------------------------------------------------------

    /**
     * Updates the internal selection animation state based on the provided
     * SelectionState and starts/stops the animation loop accordingly.
     */
    private updateSelectionAnimationState(selectionState: SelectionState): void {

        const prev = this.currentSelectionState
        const next: SelectionState = {
            selectedBoxPosition: selectionState.selectedBoxPosition,
            isPlayerSelected:    selectionState.isPlayerSelected
        }

        const hasChanged =
            prev.selectedBoxPosition !== next.selectedBoxPosition ||
            prev.isPlayerSelected    !== next.isPlayerSelected

        this.currentSelectionState = next

        // If animation is globally disabled or there are no animation sprites,
        // we shut down the loop immediately.
        if (!Settings.showAnimationFlag || !this.hasAnySelectionAnimationSprites()) {
            this.stopAnimationLoop()
            return
        }

        // Determine if there is any active animation target.
        if (this.hasActiveSelectionTargets()) {
            // Start the loop if it is not already running.
            // If the selection changed, restart timing so the animation
            // begins from frame 0 in the new context.
            if (hasChanged || this.animationFrameId == null) {
                this.resetAnimationTiming()
                this.startAnimationLoop()
            }
        } else {
            this.stopAnimationLoop()
        }
    }

    /** Returns true if the current skin provides any selection animation sprites. */
    private hasAnySelectionAnimationSprites(): boolean {
        return (
            this.skin.playerSelectedAnimationSprites.length > 0 ||
            this.skin.playerOnGoalSelectedAnimationSprites.length > 0 ||
            this.skin.boxSelectedAnimationSprites.length > 0 ||
            this.skin.boxOnGoalSelectedAnimationSprites.length > 0
        )
    }

    /** Returns true if there is at least one active selection (player or box). */
    private hasActiveSelectionTargets(): boolean {
        return (
            this.currentSelectionState.isPlayerSelected ||
            this.currentSelectionState.selectedBoxPosition !== -1
        )
    }

    /** Resets timing state for the animation loop. */
    private resetAnimationTiming(): void {
        this.animationTimeMs = 0
        this.lastAnimationTimestamp = null
    }

    /** Starts the animation RAF loop if not already running. */
    private startAnimationLoop(): void {
        if (this.animationFrameId != null) {
            return
        }

        const loop = (timestamp: DOMHighResTimeStamp) => {
            // Animation may be stopped between frames.
            if (this.animationFrameId == null) {
                return
            }

            if (this.lastAnimationTimestamp == null) {
                this.lastAnimationTimestamp = timestamp
            }

            const deltaMs = timestamp - this.lastAnimationTimestamp
            this.lastAnimationTimestamp = timestamp

            // Accumulate animation time (monotonic).
            this.animationTimeMs += deltaMs

            // Redraw selection overlays based on accumulated time.
            this.redrawSelectionAnimations()

            // Keep looping as long as there are active targets and animation is enabled.
            if (Settings.showAnimationFlag && this.hasActiveSelectionTargets()) {
                this.animationFrameId = requestAnimationFrame(loop)
            } else {
                this.stopAnimationLoop()
            }
        }

        this.animationFrameId = requestAnimationFrame(loop)
    }

    /** Stops the animation RAF loop and clears timing state. */
    private stopAnimationLoop(): void {
        if (this.animationFrameId != null) {
            cancelAnimationFrame(this.animationFrameId)
            this.animationFrameId = null
        }
        this.lastAnimationTimestamp = null
        this.animationTimeMs = 0
    }

    /**
     * Called from the external GUI when animation-related parameters
     * (skin, speed, global enable flag) change.
     *
     * Effect:
     *  - stops the current loop
     *  - resets timing
     *  - will be restarted automatically on the next updateCanvas*()
     *    if selection and Settings.showAnimationFlag still demand it.
     */
    restartAnimations(): void {
        this.stopAnimationLoop()
    }

    /**
     * Redraws selection highlight animations for the current selection state.
     *
     * This method:
     *  - uses time-based frame selection (robust to frame drops),
     *  - re-draws the underlying tile and then draws the selection sprite on top,
     *    so that animations remain visually consistent with the board underneath.
     */
    private redrawSelectionAnimations(): void {

        if (!Settings.showAnimationFlag) {
            return
        }

        const timeMs = this.animationTimeMs

        // --- Player selection animation ---

        if (this.currentSelectionState.isPlayerSelected) {
            const playerPos = this.board.playerPosition
            const onGoal    = this.board.isGoal(playerPos)

            const sprites = onGoal
                ? this.skin.playerOnGoalSelectedAnimationSprites
                : this.skin.playerSelectedAnimationSprites

            if (sprites.length > 0) {
                const frameIndex = this.computeAnimationFrameIndex(sprites.length, timeMs)
                const sprite     = sprites[frameIndex]

                this.redrawTileWithOverlay(playerPos, sprite)
            }
        }

        // --- Box selection animation ---

        const boxPos = this.currentSelectionState.selectedBoxPosition

        if (boxPos !== -1) {
            const onGoal = this.board.isGoal(boxPos)

            const sprites = onGoal
                ? this.skin.boxOnGoalSelectedAnimationSprites
                : this.skin.boxSelectedAnimationSprites

            if (sprites.length > 0) {
                const frameIndex = this.computeAnimationFrameIndex(sprites.length, timeMs)
                const sprite     = sprites[frameIndex]

                this.redrawTileWithOverlay(boxPos, sprite)
            }
        }
    }

    /**
     * Computes which animation frame to show for a sprite sequence of the given
     * length at a specific animation time (in milliseconds).
     *
     * The frame duration is derived from:
     *   - full cycle ≈ 1000 ms at 100% speed
     *   - scaled by Settings.selectedObjectAnimationsSpeedPercent
     *
     * This function is purely time-based and robust against frame drops.
     */
    private computeAnimationFrameIndex(frameCount: number, timeMs: number): number {
        const speedPercent = Settings.selectedObjectAnimationsSpeedPercent || 100

        // Base duration for a full cycle: 1000 ms.
        // At 100% speed with N frames, each frame gets 1000 / N ms.
        const baseFrameDurationMs = 1000 / frameCount

        // Higher speedPercent => shorter frame duration (faster animation).
        const frameDurationMs = baseFrameDurationMs * (100 / speedPercent)

        const normalized = timeMs / frameDurationMs
        const index = Math.floor(normalized) % frameCount

        return index < 0 ? 0 : index
    }

    /**
     * Redraws the base tile at the given position and then draws the
     * specified overlay sprite (used for selection highlight frames).
     */
    private redrawTileWithOverlay(position: number, overlaySprite: SpriteData): void {
        this.drawBaseTileAtPosition(position, this.lastPlayerDirection)

        const { outputX, outputY } = this.getCanvasCoordinatesForPosition(position)
        this.drawSprite(overlaySprite, outputX, outputY)
    }

    // ---------------------------------------------------------------------
    // Base tile drawing (no selection overlays)
    // ---------------------------------------------------------------------

    /**
     * Draws the tile at the given board position (floor, walls, boxes, player, etc.),
     * including reachability markers, but without any selection animation overlay.
     */
    private drawBaseTileAtPosition(position: number, playerDirection: DIRECTION): void {
        const boardElement = this.board.getXSB_Char(position)

        // Background tiles are never drawn; they simply remain empty.
        if (boardElement === XSB_BACKGROUND) {
            return
        }

        const { outputX, outputY } = this.getCanvasCoordinatesForPosition(position)

        // Honor "hide walls" setting by clearing tiles that contain a wall.
        if (boardElement === XSB_WALL && Settings.hideWallsFlag) {
            this.ctx.clearRect(outputX, outputY, this.graphicDisplaySize, this.graphicDisplaySize)
            return
        }

        // For skins with transparent player/box sprites, draw the floor first.
        this.drawSprite(this.skin.getFloorSprite(), outputX, outputY)

        // Draw the main sprite at this position (walls, goals, boxes, player, ...).
        const spriteData = this.skin.getSprite(this.board, position, playerDirection)
        this.drawSprite(spriteData, outputX, outputY)

        // Optional reachability overlay (small circle).
        const reachable = this.board.reachableMarker[position]
        if (reachable === REACHABLE_PLAYER || reachable === REACHABLE_BOX) {
            this.drawReachableGraphic(outputX, outputY)
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
