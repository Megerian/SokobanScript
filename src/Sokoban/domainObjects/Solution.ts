import {Snapshot} from "./Snapshot"
import {Metrics} from "./Metrics"

/**
 * A [Solution] represents the moves the player has made for solving a Sokoban puzzle.
 *
 * A solution in this app is unique for a puzzle with respect to its lurd representation.
 * This app doesn't allow duplicate solutions for a puzzle. This ensures there can only
 * be one best solution.
 *
 * A solution and the stored metrics are only valid for a specific `Puzzle`.
 */
export class Solution extends Snapshot {

    constructor(public lurd: string, metrics: Metrics = new Metrics()) {
        super(lurd, metrics)
    }

    equals(other: Snapshot): boolean {
        return other.lurd === this.lurd
    }
}