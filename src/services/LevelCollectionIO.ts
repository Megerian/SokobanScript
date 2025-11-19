import {Board} from "../board/Board"
import {Level} from "../Sokoban/domainObjects/Level"
import {Collection} from "../Sokoban/domainObjects/Collection"

export class LevelCollectionIO {

    /**
     * Returns whether the passed state1 is better, equal or worse than state2.
     * regarding first moves, then pushes.
     */
    static async loadLevelCollection(collectionFile: string): Promise<Collection> {

        return await fetch(collectionFile, {
            method: "GET",
            headers: {"Content-type": "text/plaincharset=UTF-8"}
        })
        .then(response => response.text()).then(collectionAsString => {
            const levels = this.parseLevelCollectionLevels(collectionAsString)

            const collectionTitle = collectionFile.split("/").pop() ?? ""
            return new Collection(collectionTitle, "", levels)
        })
    }

    /**
     * Parses a text in classic Sokoban collection format (.sok) into a list of levels.
     * Each level is detected by its board rows (#-lines) followed by a "Title:" line.
     */
    static parseLevelCollectionLevels(collectionAsString: string): Array<Level> {

        const collectionLines = collectionAsString.replace(/\r/g, "")
                                                  .split(/\n/)
                                                  .filter(row => row.includes('#') || row.includes(':'))

        const collectionLevels = Array<Level>()

        let boardAsString = ""
        let title = ""
        let letslogicID = 0
        let levelNo = 0

        for(const row of collectionLines) {
            if(row.includes('#')) boardAsString += row + "\n"
            if(row.includes('ID:')) letslogicID = parseInt(row.slice(4))
            if(row.includes('Title:')) {
                title = row.substring(6).trim()

                const board = Board.createFromString(boardAsString)
                if (typeof board !== 'string') {
                    levelNo++
                    const level = new Level(board)
                    level.title = title
                    level.letsLogicID = letslogicID
                    level.levelNumber = levelNo

                    collectionLevels.push(level)
                }

                boardAsString = ""
                title = ""
                letslogicID = 0
            }
        }

        return collectionLevels
    }
}