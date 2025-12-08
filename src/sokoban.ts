import { SokobanApp } from "./app/SokobanApp"
import { URLParameterParser } from "./URLParameterParser"
import { Puzzle } from "./Sokoban/domainObjects/Puzzle"

const app = new SokobanApp()

// Expose the app instance for debugging in the browser console.
// This allows you to type "sokobanApp" in the browser console.
;(window as any).sokobanApp = app

async function startApp(): Promise<void> {
    try {
        // Initialize the app and parse the URL parameter in parallel.
        const [_, startPuzzleViaURL] = await Promise.all([
            app.init(),
            URLParameterParser.parsePuzzleFromURLParameter()
        ])

        const collectionSelector =
            document.getElementById("collectionSelector") as HTMLSelectElement | null

        if (!collectionSelector) {
            console.error("Element with id 'collectionSelector' not found.")
            return
        }

        if (startPuzzleViaURL) {
            // Remove URL parameters from the address bar.
            window.history.replaceState("", "Sokoban", location.origin)

            // Set a default title if none is provided.
            if (!startPuzzleViaURL.title || startPuzzleViaURL.title.trim().length === 0) {
                startPuzzleViaURL.title = "Sokoban Statistics Puzzle"
            }

            // Add the puzzle as a new "collection" entry to the UI.
            addUserPuzzleEntry(startPuzzleViaURL, collectionSelector)
        }

        // Trigger the "change" event so that the appropriate puzzle/collection
        // is loaded (either the user puzzle or the default one).
        collectionSelector.dispatchEvent(new CustomEvent("change"))
    } catch (error) {
        console.error("Failed to bootstrap Sokoban app:", error)
    }
}

startApp()

// PWA: register service worker (non-blocking)
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register(new URL("./service-worker.js", import.meta.url))
            .then(reg => {
                if (process.env.NODE_ENV === "development") {
                    console.log("Service worker registered with scope:", reg.scope)
                }
            })
            .catch(err => {
                console.error("Service worker registration failed:", err)
            })
    })
}

/**
 * Adds a new entry to the list for the user puzzle as a separate "collection".
 */
function addUserPuzzleEntry(puzzle: Puzzle, collectionSelector: HTMLSelectElement): void {
    const userPuzzleOption = document.createElement("option")

    // Store the board string as value so it can be re-parsed later if needed.
    userPuzzleOption.value = puzzle.board.getBoardAsString()
    userPuzzleOption.innerText = puzzle.title

    // Add the new collection as the first option.
    collectionSelector.replaceChildren(userPuzzleOption, ...collectionSelector.children)
    collectionSelector.selectedIndex = 0
}
