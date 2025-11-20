import { DIRECTION, Directions, DOWN, LEFT, RIGHT, UP } from "../Sokoban/Directions"
import { Board, NOT_REACHABLE } from "../board/Board"
import { MoveHistory } from "./MoveHistory"
import { Action, GUI } from "../gui/GUI"
import { Sound } from "../sound/Sound"
import { PlayerPathFinding } from "../services/pathFinding/PlayerPathFinding"
import { BoxPathFinding } from "../services/pathFinding/BoxPathFinding"
import { Settings } from "./Settings"
import { Utilities } from "../Utilities/Utilities"
import { PuzzleFormat } from "../Sokoban/PuzzleFormat"
import { LURDVerifier } from "../services/lurdVerifier/LurdVerifier"
import { Solution } from "../Sokoban/domainObjects/Solution"
import { Puzzle } from "../Sokoban/domainObjects/Puzzle"
import { Snapshot } from "../Sokoban/domainObjects/Snapshot"
import { DataStorage } from "../storage/DataStorage"
import { Messages } from "../gui/Messages"

export const NONE = -1

const enum MovementType {
    MOVE = "Move",
    PUSH = "Push",
    PUSH_TO_GOAL = "PushToGoal",
    NONE = "None"
}

export class SokobanApp {

    private readonly gui: GUI

    moves  = 0
    pushes = 0

    readonly moveHistory = new MoveHistory()

    selectedBoxPosition = NONE
    isPlayerSelected    = false

    /** Flag indicating whether the player is currently moving along an animated path. */
    private isPlayerCurrentlyMoving = false

    board: Board = Board.getDummyBoard()

    /** The currently active puzzle (domain object is still called Puzzle). */
    private puzzle: Puzzle = new Puzzle(this.board)

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

    /** Initialize the app. */
    async init(): Promise<void> {
        DataStorage.init()
        await Settings.loadSettings()
        await this.gui.setCurrentSettings()
    }

    // ---------------------------------------------------------------------
    // Puzzle setup
    // ---------------------------------------------------------------------

    /**
     * Sets a given puzzle as the current playable puzzle.
     * This also resets move counters, history, path finding and snapshot/solution list.
     */
    setPuzzleForPlaying(puzzle: Puzzle): void {

        if (!puzzle) {
            console.error("setPuzzleForPlaying called with undefined puzzle", this);
            return;
        }

        // Store reference so snapshots/solutions are attached to the correct puzzle.
        this.puzzle = puzzle

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
                        this.addSolutionToPuzzle(snap, false)
                    } else {
                        this.addSnapshotToPuzzle(snap, false)
                    }
                })

                // Rebuild list after all stored items have been added
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

        // Move history has already been adjusted by the caller.

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

            // false -> without GUI update; we update once at the end.
            this.movePlayerToDirectionUndo(oppositeDirection, Directions.isPushChar(moveChar), false)

            moveChar = this.moveHistory.undoMove()
        }

        // According to Sokoban YASC "undo all" plays no sound.
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
            const movementType = this.movePlayerToDirection(direction, true, false) // recordHistory = false

            if (movementType !== MovementType.NONE) {
                lastMovementType = movementType
            }

            nextMoveChar = this.moveHistory.redoMove()
        }

        // According to Sokoban YASC play the sound for the last movement.
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

        // When the puzzle is solved, block further play actions.
        if (this.board.isSolved()) {
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
            case Action.undoAll: this.undoAllMoves();               break
            case Action.undo:    this.undoMove();                   break
            case Action.redo:    this.redoMove();                   break
            case Action.redoAll: this.redoAllMoves();               break

            case Action.moveLeft:  this.doMove(LEFT);               break
            case Action.moveRight: this.doMove(RIGHT);              break
            case Action.moveUp:    this.doMove(UP);                 break
            case Action.moveDown:  this.doMove(DOWN);               break

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
     * Imports a puzzle from a raw string (clipboard or file)
     * and sets it as the current playable puzzle.
     */
    public importPuzzleFromString(rawPuzzleString: string): void {

        const boardRows      = rawPuzzleString.trim().split("\n")
        const validBoardRows = boardRows.filter(PuzzleFormat.isValidBoardRow)
        const boardAsString  = validBoardRows.join("\n")

        const board = Board.createFromString(boardAsString)
        if (typeof board === "string") {
            // Show "invalid board" modal.
            $("#boardAsString").html(validBoardRows.join("</br>"))
            $("#boardErrorMessage").html(board);

            ($("#showInvalidBoard") as any).modal({
                onShow:   () => { GUI.isModalDialogShown = true },
                onHidden: () => { GUI.isModalDialogShown = false }
            }).modal("show")

            return
        }

        const puzzle = new Puzzle(board)
        puzzle.title = "Imported puzzle"

        this.setPuzzleForPlaying(puzzle)
    }

    /** Stores the current puzzle in the clipboard. */
    private copyPuzzleToClipboard(): void {
        Utilities.copyToClipboard(this.board.getBoardAsString())
        Messages.showSuccessMessage("Copy successful", "Puzzle has been copied to the clipboard")
    }

    // ---------------------------------------------------------------------
    // Importing LURD as snapshot / solution
    // ---------------------------------------------------------------------

    private async importLURDString(): Promise<void> {

        const string = await Utilities.getStringFromClipboard()
        if (string == null) {
            return
        }

        const trimmedString = string.trim()
        const verifyResult  = this.lurdVerifier.verifyLURD(trimmedString)

        if (verifyResult == null) {
            this.showMessageInvalidLURDString(trimmedString)
            return
        }

        if (verifyResult instanceof Solution) {
            const hasBeenAdded = this.addSolutionToPuzzle(verifyResult)
            if (hasBeenAdded) {
                this.refreshSnapshotListInGUI()
            }
        } else {
            const hasBeenAdded = this.addSnapshotToPuzzle(verifyResult)
            if (hasBeenAdded) {
                this.refreshSnapshotListInGUI()
            }
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

        // Let the LURDVerifier compute normalized LURD and metrics.
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
     * Returns true if adding the solution has been successful, false if it is a duplicate.
     */
    private addSolutionToPuzzle(solution: Solution, showMessages: boolean = true): boolean {

        const hasBeenAdded = this.puzzle.addSolution(solution)

        if (hasBeenAdded) {
            if (showMessages) {
                Messages.showSuccessMessage("Solution added", "The solution has been added to the puzzle")
            }

            DataStorage.storeSolution(this.puzzle.board, solution)
                .catch(error => console.error("Failed to store solution", error))
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
     * Returns true if adding the snapshot has been successful, false if it is a duplicate.
     */
    private addSnapshotToPuzzle(snapshot: Snapshot, showMessages: boolean = true): boolean {

        const hasBeenAdded = this.puzzle.addSnapshot(snapshot)

        if (hasBeenAdded) {
            if (showMessages) {
                Messages.showSuccessMessage("Snapshot added", "The snapshot has been added to the puzzle")
            }

            DataStorage.storeSnapshot(this.puzzle.board, snapshot)
                .catch(error => console.error("Failed to store snapshot/solution", error))
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

        // Build ordered list: best-by-push, best-by-move (if different), then the rest
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
        // You can change this to a different default ordering if you like
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

        // Suppress "puzzle solved" animation and auto-saving during loading.
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
            const movementType = this.movePlayerToDirection(direction, false, false) // no GUI update, no history

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

            // Rebuild the list so that "best" solution markers are updated
            this.refreshSnapshotListInGUI()

            if (snapshot instanceof Solution) {
                Messages.showSuccessMessage(
                    "Solution deleted",
                    "The solution has been removed from this puzzle."
                )
            } else {
                Messages.showSuccessMessage(
                    "Snapshot deleted",
                    "The snapshot has been removed from this puzzle."
                )
            }
        } else {
            Messages.showWarningMessage(
                "Not found",
                "The snapshot/solution was not found for the current puzzle."
            )
        }
    }
}
