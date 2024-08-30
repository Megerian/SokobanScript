import {Utilities} from "./Utilities/Utilities"
import {LevelCollectionIO} from "./services/LevelCollectionIO"
import {Board} from "./board/Board"
import {Level} from "./Sokoban/domainObjects/Level"
import {Base64URL} from "./services/StringConversions/Base64URL"

/**
 * Parser for parsing the URL parameters for level data.
 */
export class URLParameterParser {

    /**
     * Parses the URL parameters for level data and returns
     * the parsed `Level`.
     */
    static parseLevelFromURLParameter(): Level | null {
        return this.getLevelByIDURLParameter()     ??   // ?id=4711
               this.getURLEncodedLevelFromURL()    ??   // ?level=%23%23%23%23%23%0A%23%40%24.%23%0A%23%23%23%23%23
               this.getBase64EncodedLevelFromURL()      // ?base64=IyMjIyMKI0AkLiMKIyMjIyM
    }

    /**
     * When the URL parameter "id" is given try to load the level
     * with that ID from the server.
     */
    private static getLevelByIDURLParameter(): Level | null {

        const levelID = Utilities.getURLParameter("id")
        if (levelID != null) {
            LevelCollectionIO.loadLevelCollection("resources/levels/" + levelID + ".sok").then(collection => {
                if (collection.levels.length > 0) {
                    return collection.levels.pop()!!
                }
            })
        }
        return null
    }

    /**
     * The level (board) can be passed as URL parameter "level" URL encoded.
     * This method reads the given URl parameter and returns a `Level`
     * object for the parsed board.
     */
    private static getURLEncodedLevelFromURL(): Level | null {

        const levelBoard = Utilities.getURLParameter("level")
        if (levelBoard != null) {
            const realLevelBoard = decodeURI(levelBoard)
            const board = Board.createFromString(realLevelBoard)
            if (typeof board !== 'string') {
                return new Level(board)
            }
        }

        return null
    }

    /**
     * The level (board) can be passed as URL parameter "base64" base64URL encoded.
     * This method reads the given URl parameter and returns a `Level`
     * object for the parsed board.
     */
    private static getBase64EncodedLevelFromURL(): Level | null {

        const levelBoard = Utilities.getURLParameter("base64")
        if (levelBoard != null) {
            const realLevelBoard = Base64URL.decode(levelBoard)

            const board = Board.createFromString(realLevelBoard)
            if (typeof board !== 'string') {
                return new Level(board)
            }
        }

        return null
    }
}