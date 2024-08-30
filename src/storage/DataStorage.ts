import localforage from "localforage"

export class DataStorage {

    static exportDatabaseContentToFile() {
        let myJson = JSON.stringify("test")
        let element = document.createElement('a')
        element.setAttribute('href', 'data:text/plaincharset=utf-8,' + encodeURIComponent(myJson))
        element.setAttribute('download', 'Sokoban data.json')
        element.style.display = 'none'
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
    }

    /**
     * Configure the localforage storage.
     */
    static init() {
        localforage.config({
            name        : 'Sokoban Typescript',
            description : 'DataStorage for Sokoban Typescript'
        })
    }

    // private getContent(): string {
        // The same code, but using ES6 Promises.
        // localforage.iterate(function(value, key, iterationNumber) {
        //     // Resulting key/value pair -- this callback
        //     // will be executed for every item in the
        //     // database.
        //     console.log([key, value])
        // }).then(function() {
        //     console.log('Iteration has completed')
        // }).catch(function(err) {
        //     // This code runs if there were any errors
        //     console.log(err)
        // })
    // }
}