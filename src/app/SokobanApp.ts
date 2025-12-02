import { DIRECTION, Directions, DOWN, LEFT, RIGHT, UP } from "../Sokoban/Directions"
import { Board, NOT_REACHABLE } from "../board/Board"
import { MoveHistory } from "./MoveHistory"
import { Sound } from "../sound/Sound"
import { PlayerPathFinding } from "../services/pathFinding/PlayerPathFinding"
import { BoxPathFinding } from "../services/pathFinding/BoxPathFinding"
import { Settings } from "./Settings"
import { Utilities } from "../Utilities/Utilities"
import { LURDVerifier } from "../services/lurdVerifier/LurdVerifier"
import { Solution } from "../Sokoban/domainObjects/Solution"
import { Puzzle } from "../Sokoban/domainObjects/Puzzle"
import { Snapshot } from "../Sokoban/domainObjects/Snapshot"
import {DataStorage, StoredBoardSnapshotsDTO} from "../storage/DataStorage"
import { Messages } from "../gui/Messages"
import { Collection } from "../Sokoban/domainObjects/Collection"
import { LetslogicService } from "../services/letslogic/LetsLogicService"
import { PuzzleCollectionIO } from "../services/PuzzleCollectionIO"
import { LURD_CHARS } from "../Sokoban/PuzzleFormat"
import {GUI} from "../gui/GUI";
import {Action} from "../gui/Actions";
import {StoragePersistenceService} from "../services/storage/StoragePersistenceService";

export const NONE = -1

const enum MovementType {
    MOVE = "Move",
    PUSH = "Push",
    PUSH_TO_GOAL = "PushToGoal",
    NONE = "None"
}

/**
 * Main application controller for the Sokoban app.
 *
 * Responsibilities:
 *  - holds current Board and Puzzle
 *  - reacts to GUI actions (keyboard, mouse, menu)
 *  - delegates to path finding, move history, storage and Letslogic service
 *  - updates the GUI and plays sounds
 */
export class SokobanApp {

    private readonly gui: GUI
    private readonly letslogicService = new LetslogicService()

    moves  = 0
    pushes = 0

    readonly moveHistory = new MoveHistory()

    selectedBoxPosition = NONE
    isPlayerSelected    = false

    /** Flag indicating whether the player is currently moving along an animated path. */
    isPlayerCurrentlyMoving = false

    board: Board = Board.getDummyBoard()

    /** The currently active puzzle. */
    private puzzle: Puzzle = new Puzzle(this.board)

    /**
     * Currently active collection (set by the GUI),
     * needed to enable "submit all collection solutions".
     */
    private currentCollection: Collection | null = null

    private playerPathFinding  = new PlayerPathFinding(this.board)
    private boxPathFinding     = new BoxPathFinding(this.board)
    private lurdVerifier       = new LURDVerifier(this.board)

    /**
     * When a redo/replay/snapshot-load solves the puzzle, do not show a “solved”
     * animation and do not auto-save a solution.
     */
    private isRedoInProgress = false

    constructor() {
        this.gui = new GUI(this)
    }

    /** Initializes the app: storage, settings, GUI. */
    async init(): Promise<void> {
        // Initialize local storage backend (localForage, IndexedDB, etc.)
        DataStorage.init()

        // Load user settings from storage
        await Settings.loadSettings()

        // Apply settings to GUI and skins
        await this.gui.setCurrentSettings()

        // Request persistent storage in the background (non-blocking)
        void StoragePersistenceService.ensurePersistentStorage()
    }


    // ---------------------------------------------------------------------
    // Puzzle setup
    // ---------------------------------------------------------------------

    /**
     * Sets a given puzzle as the current playable puzzle.
     * This also resets move counters, history, path finding and snapshot/solution list.
     *
     * Additionally, all existing solutions/snapshots of the puzzle are stored
     * in DataStorage (if not already present for this board).
     */
    setPuzzleForPlaying(puzzle: Puzzle): void {

        if (!puzzle) {
            console.error("setPuzzleForPlaying called with undefined puzzle", this)
            return
        }

        // Store reference so snapshots/solutions are attached to the correct puzzle.
        this.puzzle = puzzle

        // Persist all existing solutions/snapshots of this puzzle into DataStorage
        // in a single bulk operation (avoids race conditions).
        const existingSolutions = Array.from(this.puzzle.solutions.values())
        const existingSnapshots = Array.from(this.puzzle.snapshots.values())

        void DataStorage.storeSnapshotsBulk(
            this.puzzle.board,
            [...existingSolutions, ...existingSnapshots]
        ).catch(error => console.error("Failed to store built-in snapshots/solutions", error))

        // Clone the board to avoid mutating the puzzle's original board.
        this.board = puzzle.board.clone()

        this.moves  = 0
        this.pushes = 0

        this.selectedBoxPosition     = NONE
        this.isPlayerSelected        = false
        this.isPlayerCurrentlyMoving = false

        this.moveHistory.clear()

        this.playerPathFinding = new PlayerPathFinding(this.board)
        this.boxPathFinding    = new BoxPathFinding(this.board)
        this.lurdVerifier      = new LURDVerifier(this.board)

        // Inform the GUI that a new puzzle has been loaded.
        this.gui.newPuzzleLoaded()
        this.updateMovesPushesInGUI()

        // Clear and repopulate the snapshot/solution list.
        this.gui.clearSnapshotList()

        // 1) Built-in solutions/snapshots that are already part of the puzzle.
        this.refreshSnapshotListInGUI()

        // 2) Load stored snapshots/solutions for this board (identical boards share data).
        DataStorage.loadSnapshotsAndSolutions(this.puzzle.board)
            .then(stored => {
                stored.forEach(snap => {
                    if (snap instanceof Solution) {
                        this.addSolutionToPuzzle(snap, false, false)      // no re-store
                    } else {
                        this.addSnapshotToPuzzle(snap, false, false)      // no re-store
                    }
                })

                this.refreshSnapshotListInGUI()
            })
            .catch(error => console.error("Failed to load snapshots/solutions", error))
    }

    // ---------------------------------------------------------------------
    // Mouse click handling on the board
    // ---------------------------------------------------------------------

    async cellClicked(position: number): Promise<void> {

        if (this.board.isBox(position)) {
            this.handleBoxClicked(position)
            return
        }

        if (!this.board.isActive(position)) {
            this.handleWallOrBackgroundClicked()
            return
        }

        if (position === this.board.playerPosition && this.selectedBoxPosition === NONE) {
            this.handlePlayerClicked()
            return
        }

        if (this.board.isAccessible(position)) {
            this.handleAccessiblePositionClicked(position)
        }
    }

    /**
     * Clicking a wall or background deselects player/box
     * and removes all reachable markers.
     */
    private handleWallOrBackgroundClicked(): void {
        this.selectedBoxPosition = NONE
        this.isPlayerSelected    = false
        this.board.removeAllReachableMarkers()
        this.gui.updateCanvas()
    }

    /**
     * Called when the user clicks an accessible cell (floor/goal/player).
     * If a box is selected, try to push that box to the clicked position.
     * Otherwise, move the player there.
     */
    private handleAccessiblePositionClicked(position: number): void {

        let path: number[] | null

        if (this.selectedBoxPosition !== NONE) {
            path = this.getPlayerPathForPushingBox(this.selectedBoxPosition, position)
        } else {
            path = this.playerPathFinding.getPathTo(position)
        }

        // Any movement clears selection and reachable markers.
        this.selectedBoxPosition = NONE
        this.isPlayerSelected    = false
        this.board.removeAllReachableMarkers()
        this.gui.updateCanvas()

        if (path == null) {
            SokobanApp.playSoundForMovementType(MovementType.NONE)
        } else {
            this.isPlayerCurrentlyMoving = true
            this.movePlayerWithAnimation(path).then(lastMovementType => {
                this.isPlayerCurrentlyMoving = false
                SokobanApp.playSoundForMovementType(lastMovementType)
            })
        }
    }

    /**
     * Called when the user clicks a box.
     * - Clicking another box selects that box and shows reachable positions.
     * - Clicking the same box again deselects it.
     */
    private handleBoxClicked(position: number): void {

        this.isPlayerSelected = false
        this.board.removeAllReachableMarkers()

        if (position === this.selectedBoxPosition) {
            this.selectedBoxPosition = NONE
        } else {
            this.selectedBoxPosition = position
            const reachableBoxPositions = this.boxPathFinding.getReachableBoxPositions(position)
            this.board.markBoxReachable(reachableBoxPositions)
        }

        this.gui.updateCanvas()
    }

    /**
     * Called when the user clicks the player (no box selected).
     * Toggles reachable position markers for the player.
     */
    private handlePlayerClicked(): void {
        if (this.isPlayerSelected) {
            this.isPlayerSelected = false
            this.board.removeAllReachableMarkers()
        } else {
            this.isPlayerSelected = true
            const reachablePlayerPositions = this.playerPathFinding.getReachablePositions()
            this.board.markPlayerReachable(reachablePlayerPositions)
            // Do not draw reachable graphic above the player itself.
            this.board.reachableMarker[this.board.playerPosition] = NOT_REACHABLE
        }
        this.gui.updateCanvas()
    }

    // ---------------------------------------------------------------------
    // Path + animation
    // ---------------------------------------------------------------------

    /**
     * Moves the player along a given path with animation.
     * Returns the last movement type performed (for sound).
     */
    private async movePlayerWithAnimation(playerPath: number[]): Promise<MovementType> {

        let lastMovementType = MovementType.NONE

        for (let moveNo = 0; moveNo < playerPath.length; moveNo++) {
            const newPlayerPosition = playerPath[moveNo]

            // Movement may be stopped by clicking another cell.
            if (this.isPlayerCurrentlyMoving) {
                const moveDirection = this.board.getDirectionOfMove(this.board.playerPosition, newPlayerPosition)
                lastMovementType = this.movePlayerToDirection(moveDirection)

                if (moveNo < playerPath.length - 1 && Settings.moveAnimationDelayMs !== 0) {
                    await this.sleep(Settings.moveAnimationDelayMs)
                }
            }
        }

        return lastMovementType
    }

    /**
     * Returns the positions the player must go along to push a box from
     * `startBoxPosition` to `targetBoxPosition`, or `null` if no such path exists.
     */
    private getPlayerPathForPushingBox(
        startBoxPosition: number,
        targetBoxPosition: number
    ): number[] | null {

        const boxPath = this.boxPathFinding.getBoxPathPushesMoves(startBoxPosition, targetBoxPosition)
        if (boxPath == null) return null
        if (boxPath.length === 0) return []

        const playerPositionBackup = this.board.playerPosition
        let currentBoxPosition     = startBoxPosition

        const playerPositions: number[] = []

        for (const newBoxPosition of boxPath) {

            this.board.setBox(currentBoxPosition)
            const positionToPushFrom = currentBoxPosition + (currentBoxPosition - newBoxPosition)
            const playerPath         = this.playerPathFinding.getPathTo(positionToPushFrom)
            this.board.removeBox(currentBoxPosition)

            if (playerPath == null) {
                alert("Bug: no path to push box for player found.")
                return []
            }

            playerPositions.push(...playerPath)
            playerPositions.push(currentBoxPosition)

            this.board.playerPosition = currentBoxPosition
            currentBoxPosition        = newBoxPosition
        }

        // Restore original board state.
        this.board.playerPosition = playerPositionBackup
        this.board.setBox(startBoxPosition)

        return playerPositions
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    // ---------------------------------------------------------------------
    // Move / push counters + solved handling
    // ---------------------------------------------------------------------

    /** Updates move/push counters in the GUI and enables/disables undo/redo buttons. */
    private updateMovesPushesInGUI(): void {

        this.gui.movesText.textContent  = String(this.moves)
        this.gui.pushesText.textContent = String(this.pushes)

        // Redo buttons enabled only if there is at least one undone move.
        if (!this.moveHistory.hasRedo) {
            this.gui.redoAllButton.setAttribute("disabled", "true")
            this.gui.redoButton.setAttribute("disabled", "true")
        } else {
            this.gui.redoAllButton.removeAttribute("disabled")
            this.gui.redoButton.removeAttribute("disabled")
        }

        // Undo buttons enabled only if there is at least one played move.
        if (!this.moveHistory.hasUndo) {
            this.gui.undoAllButton.setAttribute("disabled", "true")
            this.gui.undoButton.setAttribute("disabled", "true")
        } else {
            this.gui.undoAllButton.removeAttribute("disabled")
            this.gui.undoButton.removeAttribute("disabled")
        }

        // Puzzle solved handling
        if (this.board.isSolved() && this.moves > 0) {

            // Only treat this as "played solution" if we are not in a redo/replay context.
            if (!this.isRedoInProgress) {
                // 1) Show animation + sound
                this.gui.showPuzzleSolvedAnimation()
                Sound.playPuzzleSolvedSound()

                // 2) Automatically save the current solution (if it is valid and new)
                this.autoSaveCurrentSolutionIfPuzzleSolved()
            }
        }
    }

    /**
     * Automatically verifies and stores the current move history as a solution
     * when the puzzle has just been solved through normal play.
     */
    private autoSaveCurrentSolutionIfPuzzleSolved(): void {
        const lurd = this.moveHistory.lurd
        if (!lurd || lurd.length === 0) {
            return
        }

        const verified = this.lurdVerifier.verifyLURD(lurd)
        if (!(verified instanceof Solution)) {
            return
        }

        const hasBeenAdded = this.addSolutionToPuzzle(verified, false)
        if (hasBeenAdded) {
            this.refreshSnapshotListInGUI()
        }
    }

    // ---------------------------------------------------------------------
    // Low-level movement operations
    // ---------------------------------------------------------------------

    /**
     * Performs a move of the player to the given direction
     * and updates the GUI accordingly.
     */
    doMove(direction: DIRECTION): void {
        // A move by keyboard removes any box selection.
        this.selectedBoxPosition = NONE

        const movementType = this.movePlayerToDirection(direction)
        SokobanApp.playSoundForMovementType(movementType)
    }

    private static playSoundForMovementType(movementType: MovementType): void {
        switch (movementType) {
            case MovementType.MOVE:
                Sound.playMoveSound()
                break
            case MovementType.PUSH:
                Sound.playPushSound()
                break
            case MovementType.PUSH_TO_GOAL:
                Sound.playPushToGoalSound()
                break
            case MovementType.NONE:
                Sound.playMoveBlockedSound()
                break
        }
    }

    /**
     * Moves the player to the given direction if possible.
     * This includes pushing a box if necessary.
     *
     * If `recordHistory` is false, the move history is not modified
     * (useful for undo/redo or loading snapshots).
     */
    private movePlayerToDirection(
        direction: DIRECTION,
        updateGUI: boolean = true,
        recordHistory: boolean = true
    ): MovementType {

        const currentPlayerPosition = this.board.playerPosition
        const newPlayerPosition     = this.board.getPlayerNeighborPosition(direction)

        // Simple move (no box).
        if (this.board.isAccessible(newPlayerPosition)) {
            this.board.playerPosition = newPlayerPosition
            this.moves++

            if (recordHistory) {
                this.moveHistory.addMove(Directions.getMoveCharForDirection(direction))
            }

            if (updateGUI) {
                this.gui.updateCanvasForPositions(currentPlayerPosition, newPlayerPosition)
                this.updateMovesPushesInGUI()
            }

            return MovementType.MOVE
        }

        // Push.
        if (this.board.isBox(newPlayerPosition)) {
            const newBoxPosition = this.board.getNeighborPosition(newPlayerPosition, direction)
            if (this.board.isAccessible(newBoxPosition)) {
                this.board.pushBox(newPlayerPosition, newBoxPosition)
                this.board.playerPosition = newPlayerPosition
                this.moves++
                this.pushes++

                if (recordHistory) {
                    this.moveHistory.addMove(Directions.getPushCharForDirection(direction))
                }

                if (updateGUI) {
                    this.gui.updateCanvasForPositions(currentPlayerPosition, newPlayerPosition, newBoxPosition)
                    this.updateMovesPushesInGUI()
                }

                return this.board.isGoal(newBoxPosition)
                    ? MovementType.PUSH_TO_GOAL
                    : MovementType.PUSH
            }
        }

        return MovementType.NONE
    }

    /**
     * Moves the player to the given direction when performing an undo.
     * This includes pulling a box if necessary.
     *
     * "Undo" means moves/pushes metrics decrease accordingly.
     */
    private movePlayerToDirectionUndo(
        direction: DIRECTION,
        doPull: boolean,
        withGUIUpdate = true
    ): MovementType {

        const currentPlayerPosition = this.board.playerPosition
        const newPlayerPosition     = this.board.getPlayerNeighborPosition(direction)

        this.board.playerPosition = newPlayerPosition
        this.moves--

        const boxPosition = this.board.getNeighborPosition(
            currentPlayerPosition,
            Directions.getOpposite(direction)
        )

        if (doPull) {
            this.board.pushBox(boxPosition, currentPlayerPosition)
            this.pushes--
        }

        if (withGUIUpdate) {
            if (doPull) {
                this.gui.updateCanvasForPositions(boxPosition, currentPlayerPosition, newPlayerPosition)
            } else {
                this.gui.updateCanvasForPositions(currentPlayerPosition, newPlayerPosition)
            }
            this.updateMovesPushesInGUI()
        }

        if (!doPull) {
            return MovementType.MOVE
        }

        return this.board.isGoal(currentPlayerPosition)
            ? MovementType.PUSH_TO_GOAL
            : MovementType.PUSH
    }

    // ---------------------------------------------------------------------
    // Undo / Redo
    // ---------------------------------------------------------------------

    undoMove(): void {
        const moveChar = this.moveHistory.undoMove()
        if (moveChar == null) {
            return
        }

        const direction         = Directions.getDirectionFromLURDChar(moveChar)
        const oppositeDirection = Directions.getOpposite(direction)

        this.movePlayerToDirectionUndo(oppositeDirection, Directions.isPushChar(moveChar))
        Sound.playMoveSound()
    }

    redoMove(): void {
        const nextMoveChar = this.moveHistory.redoMove()
        if (nextMoveChar == null) {
            return
        }

        this.isRedoInProgress = true

        const direction    = Directions.getDirectionFromLURDChar(nextMoveChar)
        const movementType = this.movePlayerToDirection(direction, true, false) // recordHistory = false

        if (movementType !== MovementType.NONE) {
            SokobanApp.playSoundForMovementType(movementType)
        }

        this.isRedoInProgress = false
    }

    undoAllMoves(): void {
        let moveChar = this.moveHistory.undoMove()

        while (moveChar != null) {
            const direction         = Directions.getDirectionFromLURDChar(moveChar)
            const oppositeDirection = Directions.getOpposite(direction)

            this.movePlayerToDirectionUndo(oppositeDirection, Directions.isPushChar(moveChar), false)

            moveChar = this.moveHistory.undoMove()
        }

        this.gui.updateCanvas()
        this.updateMovesPushesInGUI()
    }

    redoAllMoves(): void {

        this.selectedBoxPosition = NONE
        this.isRedoInProgress    = true

        let lastMovementType: MovementType = MovementType.NONE

        let nextMoveChar = this.moveHistory.redoMove()
        while (nextMoveChar != null) {

            const direction    = Directions.getDirectionFromLURDChar(nextMoveChar)
            const movementType = this.movePlayerToDirection(direction, true, false)

            if (movementType !== MovementType.NONE) {
                lastMovementType = movementType
            }

            nextMoveChar = this.moveHistory.redoMove()
        }

        if (lastMovementType !== MovementType.NONE) {
            SokobanApp.playSoundForMovementType(lastMovementType)
        }

        this.isRedoInProgress = false
    }

    // ---------------------------------------------------------------------
    // Action dispatch from GUI
    // ---------------------------------------------------------------------

    doAction(action: Action): void {

        // While the animation is running, any action will just stop the animation.
        if (this.isPlayerCurrentlyMoving) {
            this.isPlayerCurrentlyMoving = false
            return
        }

        // For any non-cell-click action, deselect player and box.
        if (action !== Action.cellClicked) {
            this.deselectPlayerAndBox()
        }

        // When the puzzle is solved *after at least one move*, block further play actions.
        // This allows playing "circular puzzles" which start with a solved state.
        if (this.board.isSolved() && this.moves > 0) {
            switch (action) {
                case Action.moveLeft:
                case Action.moveRight:
                case Action.moveUp:
                case Action.moveDown:
                case Action.cellClicked:
                    return
            }
        }

        switch (action) {
            case Action.undoAll:                   this.undoAllMoves();               break
            case Action.undo:                      this.undoMove();                   break
            case Action.redo:                      this.redoMove();                   break
            case Action.redoAll:                   this.redoAllMoves();               break

            case Action.moveLeft:                  this.doMove(LEFT);                 break
            case Action.moveRight:                 this.doMove(RIGHT);                break
            case Action.moveUp:                    this.doMove(UP);                   break
            case Action.moveDown:                  this.doMove(DOWN);                 break

            case Action.cellClicked:
                this.cellClicked(this.gui.clickedPosition)
                break

            case Action.copyMovesAsString:
                this.copyMovesToClipboard(this.moveHistory.lurd)
                break

            case Action.pasteMovesFromClipboard:
                this.pasteMovesFromClipboard()
                break

            case Action.importPuzzleFromClipboard:
                this.importPuzzleFromClipboard()
                break

            case Action.copyPuzzleToClipboard:
                this.copyPuzzleToClipboard()
                break

            case Action.importLURDString:
                this.importLURDString()
                break

            case Action.saveSnapshot:
                this.saveCurrentSnapshot()
                break

            // Letslogic actions: submitting the solutions.
            case Action.submitLetslogicCurrentPuzzleSolutions: {
                const progress = this.gui.createLetslogicProgressCallbacks("currentPuzzle")
                void this.letslogicService.submitCurrentPuzzle(this.puzzle, progress)
                break
            }

            case Action.submitLetslogicCollectionSolutions: {
                const progress = this.gui.createLetslogicProgressCallbacks("collection")
                void this.letslogicService.submitCurrentCollection(this.currentCollection, progress)
                break
            }

            case Action.exportDatabase:
                void this.exportAllStoredSnapshotsToFile()
                break
        }
    }

    private deselectPlayerAndBox(): void {
        if (this.selectedBoxPosition !== NONE || this.isPlayerSelected) {
            this.selectedBoxPosition = NONE
            this.isPlayerSelected    = false
            this.board.removeAllReachableMarkers()
            this.gui.updateCanvas()
        }
    }

    // ---------------------------------------------------------------------
    // Clipboard operations (moves + puzzle)
    // ---------------------------------------------------------------------

    /** Copies the given LURD string to the clipboard. */
    copyMovesToClipboard(lurd: string): void {
        Utilities.copyToClipboard(lurd)
        Messages.showSuccessMessage("Copy successful", "Moves have been copied to the clipboard")
    }

    /** Pastes the moves stored in the clipboard (as LURD string) to the game. */
    private async pasteMovesFromClipboard(): Promise<void> {

        const string = await Utilities.getStringFromClipboard()
        if (string == null) {
            return
        }

        const trimmedString = string.trim()
        this.selectedBoxPosition = NONE

        const successfulMoves = this.movePlayerAccordingToLURDStringWithoutAnimation(trimmedString)

        if (successfulMoves > 0) {
            Messages.showSuccessMessage("Paste successful", "Moves successfully pasted: " + successfulMoves)
        } else {
            Messages.showErrorMessage("No moves pasted", "No valid moves to paste found")
        }
    }

    /**
     * Moves the player on the board without animation according to the given LURD string
     * and returns the number of successfully executed moves.
     *
     * This method DOES record the moves in the history (normal play/paste).
     */
    private movePlayerAccordingToLURDStringWithoutAnimation(lurdString: string): number {

        this.isPlayerCurrentlyMoving = true

        let successfulMoves = 0

        for (const char of lurdString) {

            if (!Directions.isValidDirectionChar(char)) {
                break
            }

            const direction    = Directions.getDirectionFromLURDChar(char)
            const movementType = this.movePlayerToDirection(direction)

            if (movementType === MovementType.NONE) {
                break
            }

            successfulMoves++
        }

        this.isPlayerCurrentlyMoving = false

        return successfulMoves
    }

    /** Imports a puzzle string from the clipboard to be played as a new puzzle. */
    private async importPuzzleFromClipboard(): Promise<void> {

        const string = await Utilities.getStringFromClipboard()
        if (string == null) {
            return
        }

        this.importPuzzleFromString(string)
    }

    /**
     * Imports a puzzle from a raw text string.
     *
     * Behavior:
     *  1) Try to parse the text as a full Sokoban collection via PuzzleCollectionIO.parsePuzzleCollection.
     *     If at least one Puzzle is found, take the first one (including its built-in solutions/snapshots).
     *  2) If no puzzle was found that way, fall back to parseSinglePuzzleWithMetadata
     *     (board + ID/Title only, no LURDs).
     *  3) On error (string result), show the "invalid board" dialog.
     */
    public importPuzzleFromString(rawPuzzleString: string): void {

        // 1) Try full collection parser first (boards + embedded solutions/snapshots).
        try {
            const puzzles = PuzzleCollectionIO.parsePuzzleCollection(rawPuzzleString)

            if (puzzles && puzzles.length > 0) {
                // If multiple puzzles are present, take the first one.
                const puzzle = puzzles[0]
                this.setPuzzleForPlaying(puzzle)
                return
            }
        } catch (e) {
            console.warn("parsePuzzleCollection failed for clipboard text, falling back to single-puzzle parser", e)
        }

        // 2) Fallback: single-puzzle parser (board + metadata only).
        const result = PuzzleCollectionIO.parseSinglePuzzleWithMetadata(rawPuzzleString)

        if (typeof result === "string") {
            // Error message from the parser.
            // Show the invalid board dialog with the raw text.
            ($("#boardAsString") as any).html(
                rawPuzzleString.replace(/\r/g, "").split("\n").join("</br>")
            )
            $("#boardErrorMessage").html(result);

            ($("#showInvalidBoard") as any).modal({
                onShow:   () => { GUI.isModalDialogShown = true },
                onHidden: () => { GUI.isModalDialogShown = false }
            }).modal("show")

            return
        }

        const puzzle = result
        this.setPuzzleForPlaying(puzzle)
    }

    /**
     * Formats a LURD string into multiple lines for export.
     */
    private formatLurdForExport(lurd: string, maxLineLength: number = 80): string {
        const parts: string[] = []

        for (let i = 0; i < lurd.length; i += maxLineLength) {
            parts.push(lurd.substring(i, i + maxLineLength))
        }

        return parts.join("\n")
    }

    /**
     * Stores the current puzzle (board, title, optional ID, solutions and snapshots)
     * in the clipboard in a textual export format.
     *
     * Format:
     *
     * <board>
     *
     * Title: <puzzle title>
     * ID: <letslogic ID>     (optional)
     *
     * Solution <moves>/<pushes>
     * <solution LURD>
     *
     * ...
     *
     * Snapshot <moves>/<pushes>
     * <snapshot LURD>
     *
     * ...
     */
    private copyPuzzleToClipboard(): void {

        // 1) Board
        const boardText = this.board.getBoardAsString().replace(/\s+$/, "")

        const lines: string[] = []
        lines.push(boardText)
        lines.push("") // empty line between board and metadata

        // 2) Title and optional Letslogic ID
        const title = this.puzzle.title || "Untitled puzzle"
        lines.push(`Title: ${title}`)

        // Adjust the property name for the Letslogic ID as needed in your Puzzle implementation.
        if (this.puzzle.letsLogicID != NONE) {
            lines.push(`ID: ${this.puzzle.letsLogicID}`)
        }

        lines.push("") // empty line before solutions / snapshots

        // 3) Solutions and snapshots
        const solutions = Array.from(this.puzzle.solutions.values())
        const snapshots = Array.from(this.puzzle.snapshots.values())

        solutions.sort((a, b) => a.createdDate - b.createdDate)
        snapshots.sort((a, b) => a.createdDate - b.createdDate)

        for (const solution of solutions) {
            lines.push(`Solution ${solution.moveCount}/${solution.pushCount}`)
            lines.push(this.formatLurdForExport(solution.lurd))
            lines.push("") // empty line after each solution
        }

        if (snapshots.length > 0 && solutions.length > 0) {
            if (lines[lines.length - 1] !== "") {
                lines.push("")
            }
        }

        for (const snapshot of snapshots) {
            lines.push(`Snapshot ${snapshot.moveCount}/${snapshot.pushCount}`)
            lines.push(this.formatLurdForExport(snapshot.lurd))
            lines.push("") // empty line after each snapshot
        }

        // Join and ensure a single trailing newline.
        const exportText = lines.join("\n").replace(/\s+$/, "") + "\n"

        Utilities.copyToClipboard(exportText)
        Messages.showSuccessMessage(
            "Copy successful",
            "Puzzle, solutions and snapshots have been copied to the clipboard."
        )
    }

    /**
     * Exports all boards with their stored snapshots/solutions from DataStorage
     * into a single text file that can be saved on disk.
     *
     * The format is compatible with the single-puzzle export used by
     * copyPuzzleToClipboard(), repeated for each stored board.
     */
    public async exportAllStoredSnapshotsToFile(): Promise<void> {

        const exportText = await this.buildStorageExportString()

        if (!exportText || exportText.trim().length === 0) {
            Messages.showWarningMessage(
                "Nothing to export",
                "There are no stored snapshots or solutions in the local data storage."
            )
            return
        }

        const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" })
        const url  = URL.createObjectURL(blob)

        const a = document.createElement("a")
        a.href = url
        a.download = "sokoban-storage-export.txt"

        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)

        URL.revokeObjectURL(url)

        Messages.showSuccessMessage(
            "Export successful",
            "All stored puzzles, solutions and snapshots have been exported to a file."
        )
    }

    /**
     * Loads all stored boards from DataStorage, counts boards, solutions and
     * snapshots and updates the database statistics display in the GUI.
     *
     * Optionally shows a notification in the message area.
     */
    private async updateDatabaseStatsInGUI(showNotification: boolean = false): Promise<void> {
        try {
            const entries = await DataStorage.loadAllBoardsWithSnapshots()

            const boardsCount  = entries.length
            let solutionsCount = 0
            let snapshotsCount = 0

            for (const entry of entries) {
                for (const snap of entry.snapshots) {
                    if (snap.isSolution) {
                        solutionsCount++
                    } else {
                        snapshotsCount++
                    }
                }
            }

            // Update numbers in the Database menu
            this.gui.setDatabaseStats(boardsCount, solutionsCount, snapshotsCount)

            if (showNotification) {
                Messages.showSuccessMessage(
                    "Database statistics refreshed",
                    `Stored boards: ${boardsCount}\n` +
                    `Stored solutions: ${solutionsCount}\n` +
                    `Stored snapshots: ${snapshotsCount}`
                )
            }

        } catch (error) {
            console.error("Failed to read database statistics", error)
            Messages.showErrorMessage(
                "Database error",
                "Could not read database statistics. Please check the browser console for details."
            )
        }
    }

    /**
     * Builds an export string for a single stored board entry
     * (boardString + its stored solutions/snapshots).
     *
     * The format is intentionally similar to copyPuzzleToClipboard():
     *
     * <board>
     *
     * Title: Stored puzzle #N
     *
     * Solution <moves>/<pushes>
     * <solution LURD>
     *
     * Snapshot <moves>/<pushes>
     * <snapshot LURD>
     */
    private buildExportForStoredBoardEntry(
        entry: StoredBoardSnapshotsDTO,
        index: number
    ): string {

        const lines: string[] = []

        const boardText = entry.boardString.replace(/\s+$/, "")
        lines.push(boardText)
        lines.push("")

        const title = `Stored puzzle #${index + 1}`
        lines.push(`Title: ${title}`)
        lines.push("")

        const solutions = entry.snapshots.filter(s => s.isSolution)
        const snapshots = entry.snapshots.filter(s => !s.isSolution)

        // We keep the stored order (no createdDate available in the DTO).
        for (const solution of solutions) {
            lines.push(`Solution ${solution.moveCount}/${solution.pushCount}`)
            lines.push(this.formatLurdForExport(solution.lurd))
            lines.push("")
        }

        if (snapshots.length > 0 && solutions.length > 0 && lines[lines.length - 1] !== "") {
            lines.push("")
        }

        for (const snapshot of snapshots) {
            lines.push(`Snapshot ${snapshot.moveCount}/${snapshot.pushCount}`)
            lines.push(this.formatLurdForExport(snapshot.lurd))
            lines.push("")
        }

        return lines.join("\n").replace(/\s+$/, "") + "\n"
    }

    /**
     * Builds a multi-puzzle export string for all boards currently
     * stored in DataStorage (new format with boardString).
     */
    private async buildStorageExportString(): Promise<string> {
        const entries = await DataStorage.loadAllBoardsWithSnapshots()

        if (entries.length === 0) {
            return ""
        }

        const parts: string[] = []

        entries.forEach((entry, index) => {
            if (!entry.boardString || entry.boardString.trim().length === 0) {
                return
            }

            if (parts.length > 0) {
                // Separate puzzles by a blank line.
                parts.push("")
            }

            parts.push(this.buildExportForStoredBoardEntry(entry, index))
        })

        const exportText = parts.join("\n").replace(/\s+$/, "") + "\n"
        return exportText
    }

    // ---------------------------------------------------------------------
    // Importing LURD as snapshot / solution (multi-LURD support)
    // ---------------------------------------------------------------------

    /**
     * Returns true if the given char is a valid LURD char.
     * Uses the same definition as PuzzleCollectionIO (LURD_CHARS).
     */
    private isLurdChar(char: string): boolean {
        return LURD_CHARS.includes(char)
    }

    /**
     * Returns true if the given line contains ONLY LURD characters
     * (ignoring surrounding whitespace).
     */
    private isLurdLine(line: string): boolean {
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
     * Imports one or more LURD strings from the clipboard as snapshots/solutions.
     *
     * The clipboard text may contain:
     *  - a single LURD string in one line
     *  - multiple LURD strings, one per line
     *  - multi-line LURD blocks (consecutive pure LURD lines are concatenated)
     *
     * All valid LURD blocks (for the current board) are verified and added.
     */
    private async importLURDString(): Promise<void> {

        const string = await Utilities.getStringFromClipboard()
        if (string == null) {
            return
        }

        const normalized = string.replace(/\r/g, "")
        const lines      = normalized.split(/\n/)

        const lurdStrings: string[] = []

        // Group consecutive LURD-only lines into blocks (same logic as in PuzzleCollectionIO).
        let i = 0
        while (i < lines.length) {
            if (!this.isLurdLine(lines[i])) {
                i++
                continue
            }

            const lurdParts: string[] = []
            let j = i
            while (j < lines.length && this.isLurdLine(lines[j])) {
                lurdParts.push(lines[j].trim())
                j++
            }

            const lurd = lurdParts.join("")
            if (lurd.length > 0) {
                lurdStrings.push(lurd)
            }

            i = j
        }

        // Fallback: if we did not detect any LURD blocks via line-based parsing,
        // treat the entire trimmed string as a single LURD candidate (old behavior).
        if (lurdStrings.length === 0) {
            const trimmedString = normalized.trim()
            if (trimmedString.length > 0) {
                lurdStrings.push(trimmedString)
            }
        }

        if (lurdStrings.length === 0) {
            this.showMessageInvalidLURDString(normalized.trim())
            return
        }

        let importedCount = 0
        let firstInvalid: string | null = null

        const newlyImportedSolutions: Solution[] = []
        const newlyImportedSnapshots: Snapshot[] = []

        for (const lurd of lurdStrings) {
            const verifyResult = this.lurdVerifier.verifyLURD(lurd)

            if (!verifyResult) {
                if (!firstInvalid) {
                    firstInvalid = lurd
                }
                continue
            }

            if (verifyResult instanceof Solution) {
                // Add to puzzle, but do not persist immediately
                const hasBeenAdded = this.addSolutionToPuzzle(verifyResult, false, false)
                if (hasBeenAdded) {
                    importedCount++
                    newlyImportedSolutions.push(verifyResult)
                }
            } else {
                // Snapshot
                const hasBeenAdded = this.addSnapshotToPuzzle(verifyResult, false, false)
                if (hasBeenAdded) {
                    importedCount++
                    newlyImportedSnapshots.push(verifyResult)
                }
            }
        }

        if (importedCount > 0) {
            // Persist all newly imported items in a single bulk operation
            try {
                await DataStorage.storeSnapshotsBulk(
                    this.puzzle.board,
                    [...newlyImportedSolutions, ...newlyImportedSnapshots]
                )
            } catch (error) {
                console.error("Failed to store imported LURDs in bulk", error)
            }

            this.refreshSnapshotListInGUI()

            Messages.showSuccessMessage(
                "Import successful",
                `${importedCount} snapshot(s)/solution(s) imported from clipboard.`
            )

            if (firstInvalid) {
                Messages.showWarningMessage(
                    "Some LURD strings ignored",
                    "One or more LURD strings were not valid for this puzzle and have been skipped."
                )
            }
        } else {
            this.showMessageInvalidLURDString(normalized.trim())
        }
    }

    // ---------------------------------------------------------------------
    // Saving current state as snapshot / solution
    // ---------------------------------------------------------------------

    /** Saves the current move history as a snapshot or solution and adds it to the puzzle and GUI. */
    private saveCurrentSnapshot(): void {

        const lurd = this.moveHistory.lurd
        if (!lurd || lurd.length === 0) {
            Messages.showWarningMessage(
                "Nothing to save",
                "There are no moves yet, so no snapshot was saved."
            )
            return
        }

        const verified = this.lurdVerifier.verifyLURD(lurd)
        if (verified == null) {
            Messages.showErrorMessage(
                "Invalid moves",
                "The current move sequence is not valid for this puzzle."
            )
            return
        }

        if (verified instanceof Solution) {
            const hasBeenAdded = this.addSolutionToPuzzle(verified)
            if (hasBeenAdded) {
                this.refreshSnapshotListInGUI()
            }
        } else {
            verified.name = "Snapshot " + (this.puzzle.snapshots.size + 1)

            const hasBeenAdded = this.addSnapshotToPuzzle(verified)
            if (hasBeenAdded) {
                this.refreshSnapshotListInGUI()
            }
        }
    }

    /**
     * Adds the passed solution to the puzzle and shows a message (optional).
     * Optionally persists the solution to DataStorage (default: true).
     * Returns true if adding the solution has been successful, false if it is a duplicate.
     */
    private addSolutionToPuzzle(
        solution: Solution,
        showMessages: boolean = true,
        persistToStorage: boolean = true
    ): boolean {

        const hasBeenAdded = this.puzzle.addSolution(solution)

        if (hasBeenAdded) {
            // if (showMessages) {              // the added solution is shown in the GUI already, hence no need to show a message
            //     Messages.showSuccessMessage("Solution added", "The solution has been added to the puzzle")
            // }

            if (persistToStorage) {
                DataStorage.storeSolution(this.puzzle.board, solution)
                    .catch(error => console.error("Failed to store solution", error))
            }
        } else if (showMessages) {
            Messages.showWarningMessage(
                "Duplicate solution",
                "The puzzle already contains this solution."
            )
        }

        return hasBeenAdded
    }

    /**
     * Adds the passed snapshot to the puzzle and shows a message (optional).
     * Optionally persists the snapshot to DataStorage (default: true).
     * Returns true if adding the snapshot has been successful, false if it is a duplicate.
     */
    private addSnapshotToPuzzle(
        snapshot: Snapshot,
        showMessages: boolean = true,
        persistToStorage: boolean = true
    ): boolean {

        const hasBeenAdded = this.puzzle.addSnapshot(snapshot)

        if (hasBeenAdded) {
            // if (showMessages) {          // the added snapshot is shown in the GUI already, hence no need to show a message
            //     Messages.showSuccessMessage("Snapshot added", "The snapshot has been added to the puzzle")
            // }

            if (persistToStorage) {
                DataStorage.storeSnapshot(this.puzzle.board, snapshot)
                    .catch(error => console.error("Failed to store snapshot/solution", error))
            }
        } else if (showMessages) {
            Messages.showWarningMessage(
                "Duplicate snapshot",
                "The puzzle already contains this snapshot."
            )
        }

        return hasBeenAdded
    }

    /**
     * Rebuilds the snapshot/solution sidebar based on the current puzzle data.
     * The best solution by pushes and by moves is placed at the very top.
     */
    private refreshSnapshotListInGUI(): void {

        if (!this.puzzle) {
            return
        }

        const solutions: Solution[] = Array.from(this.puzzle.solutions.values())
        const snapshots: Snapshot[] = Array.from(this.puzzle.snapshots.values())

        let bestByPush: Solution | null = null
        let bestByMove: Solution | null = null

        if (solutions.length > 0) {
            const sortedByPush = [...solutions].sort(Snapshot.compareByPushQuality)
            const sortedByMove = [...solutions].sort(Snapshot.compareByMoveQuality)

            bestByPush = sortedByPush[0]
            bestByMove = sortedByMove[0]
        }

        // Build ordered list: best-by-push, best-by-move (if different), then the rest.
        const orderedSolutions: Solution[] = []
        const seenIds = new Set<number>()

        const addIfNotSeen = (s: Solution | null) => {
            if (!s) return
            if (seenIds.has(s.uniqueID)) return
            seenIds.add(s.uniqueID)
            orderedSolutions.push(s)
        }

        addIfNotSeen(bestByPush)
        addIfNotSeen(bestByMove)

        const remaining = solutions.filter(s => !seenIds.has(s.uniqueID))
        remaining.sort((a, b) => a.createdDate - b.createdDate)
        orderedSolutions.push(...remaining)

        this.gui.renderSnapshotList(
            orderedSolutions,
            snapshots,
            bestByPush,
            bestByMove
        )
    }

    private showMessageInvalidLURDString(lurdString: string): void {
        Messages.showErrorMessage(
            "Invalid LURD string",
            "The imported LURD string is not valid for this puzzle: " + lurdString
        )
    }

    // ---------------------------------------------------------------------
    // Snapshots / Solutions: load + delete
    // ---------------------------------------------------------------------

    /**
     * Applies the given snapshot/solution to the board and synchronizes
     * the move history so undo/redo works correctly.
     *
     * The snapshot LURD can contain a '*' marker:
     *   donePart * undonePart
     * The board is set to the state after donePart, and the history is
     * set to (donePart + undonePart) with the cursor at donePart.length.
     */
    setSnapshot(snapshot: Snapshot): void {

        this.isRedoInProgress = true

        // 1) Reset the current board state via undo all.
        this.undoAllMoves()

        // 2) Split snapshot LURD into done and undone part.
        const raw       = snapshot.lurd
        const starIndex = raw.indexOf("*")

        const donePart   = starIndex >= 0 ? raw.substring(0, starIndex) : raw
        const undonePart = starIndex >= 0 ? raw.substring(starIndex + 1) : ""

        // 3) Set full history (done + undone) with the cursor at the end of the done part.
        this.moveHistory.setHistory(donePart + undonePart, donePart.length)

        // 4) Replay the done part on the board WITHOUT recording history again.
        this.isPlayerCurrentlyMoving = true
        this.moves  = 0
        this.pushes = 0

        for (const char of donePart) {
            if (!Directions.isValidDirectionChar(char)) {
                break
            }
            const direction    = Directions.getDirectionFromLURDChar(char)
            const movementType = this.movePlayerToDirection(direction, false, false)

            if (movementType === MovementType.NONE) {
                break
            }
        }

        this.isPlayerCurrentlyMoving = false

        // 5) Update GUI once at the end.
        this.gui.updateCanvas()
        this.updateMovesPushesInGUI()

        this.isRedoInProgress = false

        // 6) Feedback message.
        if (donePart.length > 0 || undonePart.length > 0) {
            if (snapshot instanceof Solution) {
                Messages.showSuccessMessage(
                    "Solution set on board",
                    "The saved solution state has been set on the board."
                )
            } else {
                Messages.showSuccessMessage(
                    "Snapshot set on board",
                    "The saved position has been set on the board."
                )
            }
        }
    }

    /** Deletes the given snapshot or solution from the puzzle, storage and GUI. */
    deleteSnapshot(snapshot: Snapshot): void {
        let removed = false

        if (snapshot instanceof Solution) {
            removed = this.puzzle.solutions.delete(snapshot.lurd)
        } else {
            removed = this.puzzle.snapshots.delete(snapshot.lurd)
        }

        if (removed) {
            DataStorage.deleteSnapshot(this.puzzle.board, snapshot)
                .catch(error => console.error("Failed to delete snapshot/solution", error))

            // Rebuild the list so that "best" solution markers are updated.
            this.refreshSnapshotListInGUI()
        } else {
            Messages.showWarningMessage(
                "Not found",
                "The snapshot/solution was not found for the current puzzle."
            )
        }
    }

    // ---------------------------------------------------------------------
    // Collection reference (for Letslogic)
    // ---------------------------------------------------------------------

    /**
     * Sets the current collection that is used by the GUI.
     * This is required so that we can submit all solutions for all puzzles in this collection.
     */
    setCurrentCollection(collection: Collection | null): void {
        this.currentCollection = collection
    }

    public refreshDatabaseStats(showNotification: boolean = false): void {
        void this.updateDatabaseStatsInGUI(showNotification)
    }
}
