import {DIRECTION, Directions, DOWN, LEFT, RIGHT, UP} from "../Sokoban/Directions"
import {Board, NOT_REACHABLE} from "../board/Board"
import {MoveHistory} from "./MoveHistory"
import {Action, GUI} from "../gui/GUI"
import {Sound} from "../sound/Sound"
import {PlayerPathFinding} from "../services/pathFinding/PlayerPathFinding"
import {BoxPathFinding} from "../services/pathFinding/BoxPathFinding"
import {Settings} from "./Settings"
import {Utilities} from "../Utilities/Utilities"
import {LevelFormat} from "../Sokoban/LevelFormat"
import {LURDVerifier} from "../services/lurdVerifier/LurdVerifier"
import {Solution} from "../Sokoban/domainObjects/Solution"
import {Level} from "../Sokoban/domainObjects/Level"
import {Snapshot} from "../Sokoban/domainObjects/Snapshot"
import {DataStorage} from "../storage/DataStorage"
import {Messages} from "../gui/Messages"

export const NONE = -1
const enum MovementType { MOVE= "Move", PUSH = "Push", PUSH_TO_GOAL = "PushToGoal", NONE = "None" }

export class SokobanApp {

    private gui: GUI

    moves          = 0
    pushes         = 0

    moveHistory = new MoveHistory()

    selectedBoxPosition    = NONE
    isPlayerSelected = false

    private isPlayerCurrentlyMoving = false // Flag indicating whether the player is moving now

    board = Board.getDummyBoard()
    private level = new Level(this.board)

    private playerPathFinding = new PlayerPathFinding(this.board)
    private boxPathFinding = new BoxPathFinding(this.board)
    private lurdVerifier = new LURDVerifier(this.board)

    private isRedoInProgress = false   // when a redo solves the board (again) don't show a "solved" animation

    constructor() {
        this.gui = new GUI(this)
    }

    /** Initialize the app. */
    async init() {
        DataStorage.init()                  // Configure the data storage for usage
        await Settings.loadSettings()       // Load the settings from the data storage
        await this.gui.setCurrentSettings() // Set the current settings in the GUI
    }

    setLevelForPlaying(level: Level) {

        this.board = level.board.clone()    // avoid changing the board of the level

        this.moves  = 0
        this.pushes = 0

        this.selectedBoxPosition = NONE
        this.isPlayerSelected = false
        this.isPlayerCurrentlyMoving = false // Flag indicating whether the player is moving now

        this.moveHistory.clear()

        this.playerPathFinding = new PlayerPathFinding(this.board)
        this.boxPathFinding = new BoxPathFinding(this.board)
        this.lurdVerifier = new LURDVerifier(this.board)

        this.gui.newLevelLoaded()       // inform the GUI about a new loaded level
        this.updateMovesPushesInGUI()
    }

    async cellClicked(position: number) {

        if (this.board.isBox(position)) {
            this.handleBoxClicked(position)
            return
        }

        if (!this.board.isActive(position)) {        // wall or background graphic clicked
            this.handleWallOrBackgroundClicked()
            return
        }

        if (position == this.board.playerPosition && this.selectedBoxPosition == NONE) { // player clicked, and it's not the target position for the box
            this.handlePlayerClicked()
            return
        }

        if (this.board.isAccessible(position)) {    // move the player/push a box to the clicked position
            this.handleAccessiblePositionClicked(position)
            return
        }
    }

    /**
     * Clicking a wall or a background graphic deselects the
     * player/box and removes all displayed reachable markers.
     *
     * Neither the player nor any box is moved.
     * @private
     */
    private handleWallOrBackgroundClicked() {
        this.selectedBoxPosition = NONE         // deselect any selected box
        this.isPlayerSelected = false           // deselect the player
        this.board.removeAllReachableMarkers()  // remove any displayed reachable markers
        this.gui.updateCanvas()
    }

    /**
     * Called when the user has clicked at an accessible position (floor/goal/player).
     * It's checked now whether a box is selected.
     * If yes, then the box is pushed to the clicked position, if possible.
     * If no, then the player is moved to the clicked position, if possible.
     *
     * @param position  the clicked position
     */
    private handleAccessiblePositionClicked(position: number) {

        let path: Array<number> | null

        // Calculate the path for the player to go.
        if (this.selectedBoxPosition != NONE) {
            path = this.getPlayerPathForPushingBox(this.selectedBoxPosition, position)
        } else {
            path = this.playerPathFinding.getPathTo(position)
        }

        this.selectedBoxPosition = NONE  // moving the player always removes the selection
        this.isPlayerSelected    = false // of the box and the player
        this.board.removeAllReachableMarkers()
        this.gui.updateCanvas()

        // Move player along the calculated path.
        if (path == null) {
            SokobanApp.playSoundForMovementType(MovementType.NONE)  // No movement could be made
        } else {
            this.isPlayerCurrentlyMoving = true
            this.movePlayerWithAnimation(path).then(
                (lastMovementTyp: MovementType) => {
                    this.isPlayerCurrentlyMoving = false
                    SokobanApp.playSoundForMovementType(lastMovementTyp)
                }
            )
        }
    }

    /**
     * Called when the users clicked at a box.
     * Note:
     * When another box had been selected then this new click isn't
     * considered to be a target position for the selected box.
     * That means: we don't play the "push not possible"-sound but
     * just select the new clicked box.
     *
     * @param position  position of the box
     */
    private handleBoxClicked(position: number) {

        this.isPlayerSelected = false           // stop the animation for the maybe selected player
        this.board.removeAllReachableMarkers()  // remove all previously marked reachable positions

        if (position == this.selectedBoxPosition) {
            this.selectedBoxPosition = NONE     // Clicking the same box again deselects it
        } else {
            this.selectedBoxPosition = position // Clicking a box selects it and shows its reachable positions
            const reachableBoxPositions = this.boxPathFinding.getReachableBoxPositions(position)
            this.board.markBoxReachable(reachableBoxPositions)
        }
        this.gui.updateCanvas()
    }

    /**
     * Called when the user has clicked the player (but no box has been selected).
     */
    private handlePlayerClicked() {
        if (this.isPlayerSelected) {    // Clicking at the selected player deselects the player
            this.isPlayerSelected = false
            this.board.removeAllReachableMarkers()
        } else {
            this.isPlayerSelected = true
            const reachablePlayerPositions = this.playerPathFinding.getReachablePositions()
            this.board.markPlayerReachable(reachablePlayerPositions)
            this.board.reachableMarker[this.board.playerPosition] = NOT_REACHABLE   // don't draw reachable graphic above player graphic
        }
        this.gui.updateCanvas()
    }

    private async movePlayerWithAnimation(playerPath: number[]): Promise<MovementType> {

        let lastMovementType = MovementType.NONE

        for(let moveNo=0; moveNo<playerPath.length; moveNo++) {
            const newPlayerPosition = playerPath[moveNo]
            if(this.isPlayerCurrentlyMoving) {      // moving the player may be stopped by the user by clicking on new cell
                const moveDirection = this.board.getDirectionOfMove(this.board.playerPosition, newPlayerPosition)
                lastMovementType = this.movePlayerToDirection(moveDirection)
                if(moveNo < playerPath.length-1 && Settings.moveAnimationDelayMs != 0) {    // don't wait after last move
                    await this.sleep(Settings.moveAnimationDelayMs)
                }
            }
        }

        return lastMovementType
    }

    /**
     * Returns the positions the player must go along for pushing a box from
     * `startBoxPosition` to `targetBoxPosition` or `null` in case no such path exists.
     *
     * @param startBoxPosition  the current position of the box to be pushed
     * @param targetBoxPosition  the target position of the box to be pushed
     * @return the positions the player must go to push the box
     */
    private getPlayerPathForPushingBox(startBoxPosition: number, targetBoxPosition: number): Array<number> | null {

        const boxPath = this.boxPathFinding.getBoxPathPushesMoves(startBoxPosition, targetBoxPosition)

        if(boxPath == null) return null
        if(boxPath.length == 0) return []

        let playerPositionBackup = this.board.playerPosition

        let currentBoxPosition = startBoxPosition

        const playerPositions = new Array<number>()

        for (const newBoxPosition of boxPath) {

            this.board.setBox(currentBoxPosition)
            const positionToPushFrom = currentBoxPosition + (currentBoxPosition - newBoxPosition)
            const playerPath = this.playerPathFinding.getPathTo(positionToPushFrom)
            this.board.removeBox(currentBoxPosition)

            if (playerPath == null) {
                alert("Bug: no path to push box for player found.")
                return []
            }

            playerPositions.push(...playerPath)
            playerPositions.push(currentBoxPosition)

            this.board.playerPosition = currentBoxPosition
            currentBoxPosition = newBoxPosition
        }

        // Restore the original board
        this.board.playerPosition = playerPositionBackup
        this.board.setBox(startBoxPosition)

        return playerPositions
    }

    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    private updateMovesPushesInGUI() {

        this.gui.movesText.textContent  = ""+this.moves
        this.gui.pushesText.textContent = ""+this.pushes

        if(this.moveHistory.getNextMoveLURDChar() == null) {
            this.gui.redoAllButton.setAttribute("disabled", "true")
            this.gui.redoButton.setAttribute("disabled", "true")
        } else {
            this.gui.redoAllButton.removeAttribute("disabled")
            this.gui.redoButton.removeAttribute("disabled")
        }

        if(this.moveHistory.getPlayedMoveCount() == 0) {
            this.gui.undoAllButton.setAttribute("disabled", "true")
            this.gui.undoButton.setAttribute("disabled", "true")
        } else {
            this.gui.undoAllButton.removeAttribute("disabled")
            this.gui.undoButton.removeAttribute("disabled")
        }

        if(this.board.isSolved() && this.moves > 0) {
            if (!this.isRedoInProgress) {
                this.gui.showLevelSolvedAnimation()
                Sound.playLevelSolvedSound()
            }
            // const verifyResult= this.lurdVerifier.verifyLURD(this.moveHistory.lurd)
            // if(verifyResult instanceof Solution) {
            //     const hasBeenAdded = this.addSolutionToLevel(verifyResult)
            //     if (hasBeenAdded) {         // => it's not a duplicate
            //         this.gui.updateSnapshotList(verifyResult)
            //     }
            // }
        }
    }

    /**
     * Performs a move of the player to the given direction
     * and updates the GUI accordingly.
     * @param direction
     */
    doMove(direction: DIRECTION) {

        this.selectedBoxPosition = NONE // a move by arrow key removes the box selection

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
     * This includes doing a push if necessary.
     * If the move could be done true is returned, false otherwise.
     *
     * Performing a move includes updating the GUI and the move history.
     *
     * Parameter `updateGUI` specifies whether the GUI has to be updated
     * for the performed move.
     */
    private movePlayerToDirection(direction: DIRECTION, updateGUI = true): MovementType {

        const currentPlayerPosition = this.board.playerPosition
        const newPlayerPosition = this.board.getPlayerNeighborPosition(direction)

        if(this.board.isAccessible(newPlayerPosition)) {     // player can simply walk to the new position
            this.board.playerPosition = newPlayerPosition
            this.moves++
            this.moveHistory.addMove(Directions.getMoveCharForDirection(direction))

            if(updateGUI) {
                this.gui.updateCanvasForPositions(currentPlayerPosition, newPlayerPosition)
                this.updateMovesPushesInGUI()
            }

            return MovementType.MOVE
        }

        // Check whether the player can enter the new position by pushing a box
        if(this.board.isBox(newPlayerPosition)) {
            const newBoxPosition = this.board.getNeighborPosition(newPlayerPosition, direction)
            if(this.board.isAccessible(newBoxPosition)) {
                this.board.pushBox(newPlayerPosition, newBoxPosition)
                this.board.playerPosition = newPlayerPosition
                this.moves++
                this.pushes++
                this.moveHistory.addMove(Directions.getPushCharForDirection(direction))

                if(updateGUI) {
                    this.gui.updateCanvasForPositions(currentPlayerPosition, newPlayerPosition, newBoxPosition)
                    this.updateMovesPushesInGUI()
                }
                return this.board.isGoal(newBoxPosition) ? MovementType.PUSH_TO_GOAL : MovementType.PUSH
            }
        }

        return MovementType.NONE
    }

    /**
     * Moves the player to the given direction if possible performing an "undo".
     * This includes doing a pull of a box if necessary.
     * "undo" means: the moves and pushes metrics decrease by doing this movement.
     *
     * The flag "withGUIUpdate" indicates whether the GUI is to be updated.
     */
    private movePlayerToDirectionUndo(direction: DIRECTION, doPull: boolean, withGUIUpdate = true): MovementType {

        const currentPlayerPosition = this.board.playerPosition
        const newPlayerPosition = this.board.getPlayerNeighborPosition(direction)

        this.board.playerPosition = newPlayerPosition
        this.moves--

        const boxPosition = this.board.getNeighborPosition(currentPlayerPosition, Directions.getOpposite(direction))
        if(doPull) {
            this.board.pushBox(boxPosition, currentPlayerPosition)
            this.pushes--
        }

        // Note: the move history is already adjusted by the caller!

        if(withGUIUpdate) {
            doPull ? this.gui.updateCanvasForPositions(boxPosition, currentPlayerPosition, newPlayerPosition) :
                     this.gui.updateCanvasForPositions(currentPlayerPosition, newPlayerPosition)
            this.updateMovesPushesInGUI()
        }

        return doPull ? (this.board.isGoal(currentPlayerPosition) ? MovementType.PUSH_TO_GOAL : MovementType.PUSH)  :  MovementType.MOVE
    }

    undoMove() {
        const moveChar = this.moveHistory.undoMove()

        if(moveChar != null) {
            const direction = Directions.getDirectionFromLURDChar(moveChar)
            const oppositeDirection = Directions.getOpposite(direction)
            this.movePlayerToDirectionUndo(oppositeDirection, Directions.isPushChar(moveChar))

            Sound.playMoveSound()
        }
    }

    redoMove() {
        const nextMoveChar = this.moveHistory.getNextMoveLURDChar()
        if(nextMoveChar != null) {
            this.isRedoInProgress = true
            let direction = Directions.getDirectionFromLURDChar(nextMoveChar)
            this.doMove(direction)
            this.isRedoInProgress = false
        }
    }

    undoAllMoves() {
        let moveChar = this.moveHistory.undoMove()
        while(moveChar != null) {
            const direction = Directions.getDirectionFromLURDChar(moveChar)
            const oppositeDirection = Directions.getOpposite(direction)
            this.movePlayerToDirectionUndo(oppositeDirection, Directions.isPushChar(moveChar), false)   // false -> without GUI update!
            moveChar = this.moveHistory.undoMove()
        }

        // according to Sokoban YASC "undo all" plays no sound

        this.gui.updateCanvas()
        this.updateMovesPushesInGUI()
    }

    redoAllMoves() {

        this.selectedBoxPosition = NONE // a move by arrow key removes the box selection
        this.isRedoInProgress = true

        let doneMovementType = MovementType.NONE

        let nextMoveChar = this.moveHistory.getNextMoveLURDChar()
        while(nextMoveChar != null) {
            let direction = Directions.getDirectionFromLURDChar(nextMoveChar)

            const doneMovementType = this.movePlayerToDirection(direction)
            nextMoveChar = this.moveHistory.getNextMoveLURDChar()
        }

        // According to Sokoban YASC play the sound for the last movement.
        if(doneMovementType != MovementType.NONE) {
            SokobanApp.playSoundForMovementType(doneMovementType)
        }

        this.isRedoInProgress = false
    }

    doAction(action: Action) {

        if(this.isPlayerCurrentlyMoving) {         // While the animation is running any action will
            this.isPlayerCurrentlyMoving = false   // just stop the animation and do nothing else.
            return
        }

        if(action != Action.cellClicked) {      // when any other action than clicking a board position is fired, deselect all objets
            this.deselectPlayerAndBox()
        }

        if(this.board.isSolved()) {
            switch (action) {
                case Action.moveLeft:
                case Action.moveRight:
                case Action.moveUp:
                case Action.moveDown:
                case Action.cellClicked:
                    return  // no further play allowed
            }
        }

        switch(action) {
            case Action.undoAll: this.undoAllMoves(); break
            case Action.undo:    this.undoMove();     break
            case Action.redo:    this.redoMove();     break
            case Action.redoAll: this.redoAllMoves(); break

            case Action.moveLeft:  this.doMove(LEFT);  break
            case Action.moveRight: this.doMove(RIGHT); break
            case Action.moveUp:    this.doMove(UP);    break
            case Action.moveDown:  this.doMove(DOWN);  break

            case Action.cellClicked: this.cellClicked(this.gui.clickedPosition); break

            case Action.copyMovesAsString: this.copyMovesToClipboard(this.moveHistory.lurd); break
            case Action.pasteMovesFromClipboard: this.pasteMovesFromClipboard(); break
            case Action.importLevelFromClipboard: this.importLevelFromClipboard(); break
            case Action.copyLevelToClipboard: this.copyLevelToClipboard(); break

            case Action.importLURDString: this.importLURDString(); break
        }
    }

    private deselectPlayerAndBox() {
        if(this.selectedBoxPosition != NONE || this.isPlayerSelected) {
            this.selectedBoxPosition = NONE
            this.isPlayerSelected = false
            this.board.removeAllReachableMarkers()

            this.gui.updateCanvas()
        }
    }

    /** Copies the given `lurd` string to the clipboard. */
    copyMovesToClipboard(lurd: string) {
        Utilities.copyToClipboard(lurd)
        Messages.showSuccessMessage('Copy successful', 'Moves have been copied to the clipboard')
    }

    /** Pastes the moves stored in the clipboard (as lurd string) to the game. */
    private async pasteMovesFromClipboard() {

        const string = await Utilities.getStringFromClipboard()

        if(string == null)
            return

        const trimmedString = string.trim()
        this.selectedBoxPosition = NONE // remove any box selection
        let successfulMoves = this.movePlayerAccordingToLURDStringWithoutAnimation(trimmedString)

        if (successfulMoves > 0) {
            Messages.showSuccessMessage('Paste successful', 'Moves successfully pasted: ' + successfulMoves)
        } else {
            Messages.showErrorMessage('No moves pasted', 'No valid moves to paste found')
        }
    }

    /**
     * Moves the player on the board without showing animations according to the passed lurdString
     * and returns the number of successfully done moves.
     */
    private movePlayerAccordingToLURDStringWithoutAnimation(lurdString: string): number {

        this.isPlayerCurrentlyMoving = true     // we change the board: no other action must be performed

        let successfulMoves = 0
        for (const char of lurdString) {

            if (!Directions.isValidDirectionChar(char)) {
                break
            }

            const direction = Directions.getDirectionFromLURDChar(char)
            const movementType = this.movePlayerToDirection(direction)
            if (movementType == MovementType.NONE) {
                break
            }
            successfulMoves++
        }

        this.isPlayerCurrentlyMoving = false

        return successfulMoves
    }

    /** Imports a level string from the clipboard to be played as new level. */
    private async importLevelFromClipboard() {

        const string = await Utilities.getStringFromClipboard()
        if(string == null) {
            return  // user has cancelled pasting the clipboard content
        }

        const trimmedString = string.trim()

        const boardRows = string.split("\n")
        const validBoardRows = boardRows.filter(LevelFormat.isValidBoardRow)
        const validBoardRowsAsString = validBoardRows.join("\n")

        const board = Board.createFromString(validBoardRowsAsString)    // returns a board or an error string
        if (typeof board === 'string') {
            $("#boardAsString").html(validBoardRows.join("</br>"))
            $("#boardErrorMessage").html(board);

            ($('#showInvalidBoard') as any).modal({
                onShow: () => {
                    GUI.isModalDialogShown = true
                },    // tell the GUI listeners that we
                onHidden: () => {
                    GUI.isModalDialogShown = false
                }  // handle input events
            }).modal('show')

            return
        }

        const level = new Level(board)
        level.title = "Clipboard import"

        this.setLevelForPlaying(level)
    }

    /**
     * Stores the current level in the clipboard
     */
    private copyLevelToClipboard() {
        Utilities.copyToClipboard(this.board.getBoardAsString())
        Messages.showSuccessMessage('Copy successful', 'Level have been copied to the clipboard')
    }

    private async importLURDString() {

        const string = await Utilities.getStringFromClipboard()
        if(string == null) {
            return  // user has cancelled pasting the clipboard content
        }

        const trimmedString = string.trim()

        const verifyResult= this.lurdVerifier.verifyLURD(trimmedString)

        if(verifyResult == null) {
            this.showMessageInvalidLURDString(trimmedString)
            return
        }

        if(verifyResult instanceof Solution) {
            const hasBeenAdded = this.addSolutionToLevel(verifyResult)
            if(hasBeenAdded) {
                this.gui.updateSnapshotList(verifyResult)
            }
        } else {
            const hasBeenAdded = this.addSnapshotToLevel(verifyResult)
            if(hasBeenAdded) {
                this.gui.updateSnapshotList(verifyResult)
            }
        }
    }

    /**
     * Adds the passed solution to the level and displays a message to the user.
     * Returns true if adding the solution has been successful, false if the
     * solution is a duplicate.
     *
     * @param solution  the solution to be added
     */
    private addSolutionToLevel(solution: Solution): boolean {

        const hasBeenAdded = this.level.addSolution(solution)

        if(hasBeenAdded) {
            Messages.showSuccessMessage('Solution added', 'The solution has been added to the level')
        } else {
            Messages.showWarningMessage('Duplicate solution', 'The level already contains the solution.')
        }

        return hasBeenAdded
    }

    /**
     * Adds the passed snapshot to the level and displays a message to the user.
     * Returns true if adding the snapshot has been successful, false if the
     * snapshot is a duplicate.
     *
     * @param snapshot  the snapshot to be added
     */
    private addSnapshotToLevel(snapshot: Snapshot): boolean {

        const hasBeenAdded = this.level.addSnapshot(snapshot)

        if(hasBeenAdded) {
            Messages.showSuccessMessage('Snapshot added', 'The snapshot has been added to the level')
            return true
        } else {
            Messages.showWarningMessage('Duplicate snapshot', 'The level already contains the snapshot.')
            return false
        }
    }

    private showMessageInvalidLURDString(lurdString: string) {
        Messages.showErrorMessage('Invalid lurd string', "The imported lurd string isn't valid for the level: " + lurdString)
    }

    /** Moves the player according to the lurd of the passed snapshot. */
    setSnapshot(snapshot: Snapshot) {
        this.undoAllMoves()
        const successfulMoves = this.movePlayerAccordingToLURDStringWithoutAnimation(snapshot.lurd)

        if(successfulMoves > 0) {        // should always be greater than 0!
            Messages.showSuccessMessage('Snapshot set on board', 'The snapshot has been set on the board.')
        }
    }
}