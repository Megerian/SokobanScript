import {SokobanApp} from "./app/SokobanApp"
import {URLParameterParser} from "./URLParameterParser"
import {Puzzle} from "./Sokoban/domainObjects/Puzzle";

const app = new SokobanApp()
const startPuzzleViaURL = URLParameterParser.parsePuzzleFromURLParameter()

app.init().then( () => {
    if(startPuzzleViaURL != null) {
        window.history.replaceState('', 'Sokoban', location.origin) // delete the parameters from the URL

        startPuzzleViaURL.title = "Sokoban Statistics Puzzle"
        addUserPuzzleEntry(startPuzzleViaURL) // add the puzzle as part of a new collection to the gui

        // Fake a selection of a new puzzle collection to be played so the default start puzzle is loaded.
        document.getElementById("collectionSelector")!!.dispatchEvent(new CustomEvent('change'))
    }
    else {
        // Fake a selection of a new puzzle collection to be played so the default start puzzle is loaded.
        document.getElementById("collectionSelector")!!.dispatchEvent(new CustomEvent('change'))
    }


    // Expose the app instance for debugging in the browser console.
    // This allows to type "sokobanApp" in the console of the browser to access the app instance.
    ;(window as any).sokobanApp = app
})

 /**
 * Adds a new entry to the list for the user puzzle.
 */
function addUserPuzzleEntry(puzzle: Puzzle) {
    const userPuzzleCollectionName = document.createElement('option')
    userPuzzleCollectionName.value = puzzle.board.getBoardAsString()
    userPuzzleCollectionName.innerText = puzzle.title
    const collectionSelector = document.getElementById("collectionSelector")!! as HTMLSelectElement
    collectionSelector.replaceChildren(userPuzzleCollectionName, ...collectionSelector.children) // Add the new collection as first collection
    collectionSelector.selectedIndex = 0
}