// Import the global jQuery binding file first to guarantee initialization order before plugins load
import "./jquery-global"
import "fomantic-ui/dist/semantic.min.js"

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
            // Remove URL parameters without breaking subdirectories/subpaths
            const cleanUrl = new URL(window.location.href)
            cleanUrl.search = ""
            window.history.replaceState(null, "Sokoban", cleanUrl.toString())

            // Set a default title if none is provided.
            if (!startPuzzleViaURL.title || startPuzzleViaURL.title.trim().length === 0) {
                startPuzzleViaURL.title = "Sokoban Statistics Puzzle"
            }

            // Add the puzzle as a new "collection" entry to the UI.
            addUserPuzzleEntry(startPuzzleViaURL, collectionSelector)
        }

        // Trigger standard native Event instead of CustomEvent for HTMLSelectElement
        collectionSelector.dispatchEvent(new Event("change", { bubbles: true }))
    } catch (error) {
        console.error("Failed to bootstrap Sokoban app:", error)
    }
}

// Execute application bootstrapping ONLY after the DOM is fully loaded.
// This prevents "Cannot set properties of null" errors when GUI components query checkboxes.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp)
} else {
    startApp()
}

// PWA: Inject web manifest dynamically to bypass Parcel's build-time checks and support subdirectories
window.addEventListener("load", () => {

    const manifestLink = document.createElement("link")
    manifestLink.rel = "manifest"
    manifestLink.href = "manifest.webmanifest"
    document.head.appendChild(manifestLink)

    const icoIcon = document.createElement("link")
    icoIcon.rel = "icon"
    icoIcon.type = "image/x-icon"
    icoIcon.href = "favicon.ico"
    document.head.appendChild(icoIcon)
})

// PWA: register service worker (non-blocking)
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        // Use an array join strategy to bypass Parcel's static code analysis tracer.
        // This stops Parcel from enforcing bundle control and path hashing over the service worker file.
        const swPath = ["service", "worker.js"].join("-")

        navigator.serviceWorker
            .register(swPath)
            .then(reg => {
                if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
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
    collectionSelector.insertBefore(userPuzzleOption, collectionSelector.firstChild)
    collectionSelector.selectedIndex = 0
}