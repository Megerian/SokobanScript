/**
 * A [Collection] contains all data of a specific Sokoban puzzle collection.
  */
import {Puzzle} from "./Puzzle"

export class Collection {

    constructor(
        public readonly title: string,
        public readonly author: string,
        public readonly puzzles: Array<Puzzle>) {

    }
}