// UiActions.ts
//
// Central action enum used across GUI, KeyboardController and SokobanApp.
//
// The idea:
//  - KeyboardController only knows these high-level actions (no GUI internals).
//  - GUI maps some of them to pure UI behavior (e.g. focusing selectors, toggling sidebars).
//  - SokobanApp handles the game logic actions (moves, undo/redo, imports, etc.).

export const enum Action {

    // -------------------------------------------------------------
    // Pure UI / focus actions (no game logic)
    // -------------------------------------------------------------

    /**
     * Focus and open the collection selector (e.g. triggered by keyboard).
     */
    focusCollectionSelector = "focusCollectionSelector",

    /**
     * Focus and open the puzzle selector (e.g. triggered by keyboard).
     */
    focusPuzzleSelector = "focusPuzzleSelector",

    // -------------------------------------------------------------
    // Movement (game actions on the current board)
    // -------------------------------------------------------------

    /**
     * Move the player one step to the left (if possible).
     */
    moveLeft  = "moveLeft",

    /**
     * Move the player one step to the right (if possible).
     */
    moveRight = "moveRight",

    /**
     * Move the player one step upwards (if possible).
     */
    moveUp    = "moveUp",

    /**
     * Move the player one step downwards (if possible).
     */
    moveDown  = "moveDown",

    // -------------------------------------------------------------
    // Undo / Redo
    // -------------------------------------------------------------

    /**
     * Undo a single move.
     */
    undo   = "undo",

    /**
     * Redo a single previously undone move.
     */
    redo   = "redo",

    /**
     * Undo all moves and return to the initial puzzle state.
     */
    undoAll = "undoAll",

    /**
     * Redo all available moves and go to the final state.
     */
    redoAll = "redoAll",

    // -------------------------------------------------------------
    // Snapshot / sidebar
    // -------------------------------------------------------------

    /**
     * Toggle visibility of the snapshot list sidebar.
     */
    toggleSnapshotList = "toggleSnapshotList",

    /**
     * Persist the current board state as a snapshot/solution candidate.
     */
    saveSnapshot = "saveSnapshot",

    /**
     * Toggle "delete mode" in the snapshot sidebar UI.
     */
    toggleDeleteSnapshotMode = "toggleDeleteSnapshotMode",

    // -------------------------------------------------------------
    // Puzzle navigation / selection
    // -------------------------------------------------------------

    /**
     * Fired when the user selects a new collection in the UI.
     */
    collectionSelected = "collectionSelected",

    /**
     * Fired when the user selects a new puzzle in the UI.
     */
    puzzleSelected = "puzzleSelected",

    /**
     * Navigate to the next puzzle in the current collection.
     */
    nextPuzzle = "nextPuzzle",

    /**
     * Navigate to the previous puzzle in the current collection.
     */
    previousPuzzle = "previousPuzzle",

    // -------------------------------------------------------------
    // Rendering / view-related settings
    // -------------------------------------------------------------

    /**
     * Show or hide walls when rendering the board.
     */
    hideWalls = "hideWalls",

    /**
     * Enable or disable sound effects.
     */
    toggleSoundEnabled = "toggleSoundEnabled",

    /**
     * Set a new background color (from the color input).
     */
    setBackgroundColor = "setBackgroundColor",

    /**
     * Reset the background color to the default value.
     */
    setDefaultBackgroundColor = "setDefaultBackgroundColor",

    /**
     * Set the predefined "Drops" background image.
     */
    setDropsBackgroundImage = "setDropsBackgroundImage",

    /**
     * Enable or disable move/selection animations.
     */
    showAnimationsCheckbox = "showAnimationsCheckbox",

    /**
     * Toggle board ruler visibility (row/column labels).
     */
    toggleRuler = "toggleRuler",

    // -------------------------------------------------------------
    // Clipboard / import / export (moves and puzzles)
    // -------------------------------------------------------------

    /**
     * Copy the current move sequence as a string to the clipboard.
     */
    copyMovesAsString = "copyMovesAsString",

    /**
     * Paste a move string from the clipboard and apply it.
     */
    pasteMovesFromClipboard = "pasteMovesFromClipboard",

    /**
     * Import a puzzle from the clipboard into the current session.
     */
    importPuzzleFromClipboard = "importPuzzleFromClipboard",

    /**
     * Copy the current puzzle layout to the clipboard.
     */
    copyPuzzleToClipboard = "copyPuzzleToClipboard",

    /**
     * Import a solution from a LURD string.
     */
    importLURDString = "importLURDString",

    // -------------------------------------------------------------
    // Letslogic integration
    // -------------------------------------------------------------

    /**
     * Open the Letslogic API key dialog / update the stored key.
     */
    setLetslogicApiKey = "setLetslogicApiKey",

    /**
     * Submit all solutions for the current puzzle to Letslogic.
     */
    submitLetslogicCurrentPuzzleSolutions = "submitLetslogicCurrentPuzzleSolutions",

    /**
     * Submit all solutions for the current collection to Letslogic.
     */
    submitLetslogicCollectionSolutions   = "submitLetslogicCollectionSolutions",

    // -------------------------------------------------------------
    // Database integration
    // -------------------------------------------------------------

    /**
     * Export the local database (boards, solutions, snapshots).
     */
    exportDatabase = "exportDatabase",

    // -------------------------------------------------------------
    // Board / mouse interaction
    // -------------------------------------------------------------

    /**
     * Fired when a board cell is clicked (mapped from mouse position).
     */
    cellClicked = "cellClicked",

    // -------------------------------------------------------------
    // Misc UI dialogs
    // -------------------------------------------------------------

    /**
     * Show the "How to play" help dialog.
     */
    howToPlay = "howToPlay",
}
