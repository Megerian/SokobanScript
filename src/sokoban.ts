import {SokobanApp} from "./app/SokobanApp"
import {URLParameterParser} from "./URLParameterParser"
import {Level} from "./Sokoban/domainObjects/Level";

const app = new SokobanApp()
const startLevelViaURL = URLParameterParser.parseLevelFromURLParameter()

app.init().then( () => {
    if(startLevelViaURL != null) {
        window.history.replaceState('', 'Sokoban', location.origin) // delete the parameters from the URL

        startLevelViaURL.title = "Sokoban Statistics Level"
        addUserLevelEntry(startLevelViaURL) // add the level as part of a new collection to the gui

        // Fake a selection of a new level collection to be played so the default start level is loaded.
        document.getElementById("collectionSelector")!!.dispatchEvent(new CustomEvent('change'))
    }
    else {
        // Fake a selection of a new level collection to be played so the default start level is loaded.
        document.getElementById("collectionSelector")!!.dispatchEvent(new CustomEvent('change'))
    }
})

 /**
 * Adds a new entry to the list for the user level.
 */
function addUserLevelEntry(level: Level) {
    const userLevelCollectionName = document.createElement('option')
    userLevelCollectionName.value = level.board.getBoardAsString()
    userLevelCollectionName.innerText = level.title
    const collectionSelector = document.getElementById("collectionSelector")!! as HTMLSelectElement
    collectionSelector.replaceChildren(userLevelCollectionName, ...collectionSelector.children) // Add the new collection as first collection
    collectionSelector.selectedIndex = 0
}