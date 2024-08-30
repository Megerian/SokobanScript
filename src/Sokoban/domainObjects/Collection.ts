/**
 * A [Collection] contains all data of a specific Sokoban level collection.
  */
import {Level} from "./Level"

export class Collection {

    constructor(
        public readonly title: string,
        public readonly author: string,
        public readonly levels: Array<Level>) {

    }
}