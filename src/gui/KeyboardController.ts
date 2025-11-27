// KeyboardController.ts
//
// Centralized keyboard shortcut handling for the Sokoban UI.
//
// Responsibilities:
//  - Listen to global keydown events.
//  - Ignore events while a modal dialog is open or when the user is typing in inputs.
//  - Map keys to high-level UiActions.
//  - Delegate execution to the caller via a callback.
//
// This controller is intentionally "dumb": it does not know SokobanApp,
// Board, GUI internals etc. It only calls the provided callbacks.
//

import { UiAction } from "./UiActions"

/**
 * KeyboardController
 *
 * Central place for mapping keyboard shortcuts to high-level UiActions.
 * Attach it once (typically in GUI constructor) and dispose it when the GUI
 * is torn down to avoid memory leaks.
 */
export class KeyboardController {

    /** Bound event handler so we can remove it later. */
    private readonly keydownHandler: (event: KeyboardEvent) => void

    /**
     * @param isModalOpen     Returns true while any modal dialog is open.
     *                        While this is true, no keyboard shortcuts are processed.
     * @param dispatchUiAction  Callback that executes a high-level UiAction.
     */
    constructor(
        private readonly isModalOpen: () => boolean,
        private readonly dispatchUiAction: (action: UiAction) => void
    ) {
        this.keydownHandler = (event: KeyboardEvent) => this.handleKeyDown(event)
        document.addEventListener("keydown", this.keydownHandler)
    }

    /**
     * Must be called when the controller is no longer needed
     * (e.g. when tearing down the GUI) to avoid leaking event handlers.
     */
    dispose(): void {
        document.removeEventListener("keydown", this.keydownHandler)
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /** Returns true if the event target is a text-input-like element. */
    private static isFormElement(target: EventTarget | null): boolean {
        if (!target || !(target instanceof HTMLElement)) {
            return false
        }

        const tagName = target.tagName
        if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
            return true
        }

        if (target.isContentEditable) {
            return true
        }

        return false
    }

    /**
     * Global keydown handler.
     *
     * Applies the following rules:
     *  - Ignore if Shift or Ctrl is pressed (keeps shortcuts simple).
     *  - Ignore while a modal is open (so dialogs can handle input).
     *  - Ignore if user is typing in form elements.
     *  - Map keys to UiActions and dispatch them.
     */
    private handleKeyDown(event: KeyboardEvent): void {

        // Ignore modified shortcuts (Ctrl/Shift) and while a modal is open.
        if (event.shiftKey || event.ctrlKey || this.isModalOpen()) {
            return
        }

        // Do not handle Sokoban shortcuts while the user is typing in a form control.
        if (KeyboardController.isFormElement(event.target)) {
            return
        }

        const key = event.key

        // -----------------------------------------------------------------
        // Collection / puzzle selector shortcuts
        // -----------------------------------------------------------------

        if (key === "c" || key === "C") {
            event.preventDefault()
            this.dispatchUiAction(UiAction.FocusCollectionSelector)
            return
        }

        if (key === "p" || key === "P") {
            event.preventDefault()
            this.dispatchUiAction(UiAction.FocusPuzzleSelector)
            return
        }

        // -----------------------------------------------------------------
        // Sokoban movement / undo / redo / navigation shortcuts
        // -----------------------------------------------------------------

        switch (key) {
            // Movement: left
            case "ArrowLeft":
            case "a":
            case "j":
                this.dispatchUiAction(UiAction.MoveLeft)
                event.preventDefault()
                break

            // Movement: up
            case "ArrowUp":
            case "w":
            case "i":
                this.dispatchUiAction(UiAction.MoveUp)
                event.preventDefault()
                break

            // Movement: right
            case "ArrowRight":
            case "d":
                this.dispatchUiAction(UiAction.MoveRight)
                event.preventDefault()
                break

            // Movement: down
            case "ArrowDown":
            case "s":
            case "k":
                this.dispatchUiAction(UiAction.MoveDown)
                event.preventDefault()
                break

            // Redo one move
            case "y":
            case "r":
                this.dispatchUiAction(UiAction.Redo)
                event.preventDefault()
                break

            // Undo one move
            case "z":
                this.dispatchUiAction(UiAction.Undo)
                event.preventDefault()
                break

            // Toggle snapshot list sidebar
            case "v":
                this.dispatchUiAction(UiAction.ToggleSnapshotList)
                event.preventDefault()
                break

            // Undo all moves (go to start)
            case "Home":
                this.dispatchUiAction(UiAction.UndoAll)
                event.preventDefault()
                break

            // Redo all moves (go to end)
            case "End":
                this.dispatchUiAction(UiAction.RedoAll)
                event.preventDefault()
                break

            // Duplicate mapping: delete → undo
            case "Delete":
                this.dispatchUiAction(UiAction.Undo)
                event.preventDefault()
                break

            // Duplicate mapping: insert → redo
            case "Insert":
                this.dispatchUiAction(UiAction.Redo)
                event.preventDefault()
                break

            // Next puzzle
            case "PageDown":
                this.dispatchUiAction(UiAction.NextPuzzle)
                event.preventDefault()
                break

            // Previous puzzle
            case "PageUp":
                this.dispatchUiAction(UiAction.PreviousPuzzle)
                event.preventDefault()
                break
        }
    }
}
