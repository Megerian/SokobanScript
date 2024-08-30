import {Snapshot} from "./Snapshot"
import {Metrics} from "./Metrics"

/**
 * A [Solution] represents the moves the player has made for solving a Sokoban level.
 *
 * A solution in this app is unique for a level with respect to its lurd representation.
 * This app doesn't allow duplicate solutions for a level. This ensures there can only
 * be one best solution.
 *
 * A solution and the stored metrics are only valid for a specific `Level`.
 */
export class Solution extends Snapshot {

    constructor(public lurd: string, metrics: Metrics = new Metrics()) {
        super(lurd, metrics)
    }

    equals(other: Snapshot): boolean {
        return other.lurd === this.lurd
    }
}