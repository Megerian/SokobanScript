// UiActions.ts
//
// High-level UI actions that can be triggered from various input sources
// (keyboard, mouse, menus, toolbar buttons, etc.).
//
// KeyboardController maps physical keys to these UiActions.
// GUI maps UiActions weiter auf die eigentlichen Spiel-/GUI-Operationen
// (z. B. Aufruf von SokobanApp.doAction, Fokus setzen, etc.).

export const enum UiAction {
    // -------------------------------------------------------------
    // Focus / selection shortcuts (pure UI, keine Spiellogik)
    // -------------------------------------------------------------

    /**
     * Focus and open the collection selector (e.g. via 'c' / 'C').
     */
    FocusCollectionSelector = "FocusCollectionSelector",

    /**
     * Focus and open the puzzle selector (e.g. via 'p' / 'P').
     */
    FocusPuzzleSelector = "FocusPuzzleSelector",

    // -------------------------------------------------------------
    // Movement
    // -------------------------------------------------------------

    MoveLeft  = "MoveLeft",
    MoveRight = "MoveRight",
    MoveUp    = "MoveUp",
    MoveDown  = "MoveDown",

    // -------------------------------------------------------------
    // Undo / Redo
    // -------------------------------------------------------------

    Undo   = "Undo",
    Redo   = "Redo",
    UndoAll = "UndoAll",
    RedoAll = "RedoAll",

    // -------------------------------------------------------------
    // Snapshot / sidebar
    // -------------------------------------------------------------

    /**
     * Toggle visibility of the snapshot list sidebar.
     */
    ToggleSnapshotList = "ToggleSnapshotList",

    // -------------------------------------------------------------
    // Puzzle navigation
    // -------------------------------------------------------------

    NextPuzzle     = "NextPuzzle",
    PreviousPuzzle = "PreviousPuzzle",
}
