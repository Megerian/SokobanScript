export class Metrics {
    moveCount           = 0
    pushCount           = 0
    boxLineCount        = 0
    boxChangeCount      = 0
    pushingSessionCount = 0
    playerLineCount     = 0

    /** Returns a clone of this `Metrics` */
    clone(): Metrics {
        const metrics = new Metrics()
        metrics.moveCount = this.moveCount
        metrics.pushCount = this.pushCount
        metrics.boxLineCount = this.boxLineCount
        metrics.boxChangeCount = this.boxChangeCount
        metrics.pushingSessionCount = this.pushingSessionCount
        metrics.playerLineCount = this.playerLineCount

        return metrics
    }
}