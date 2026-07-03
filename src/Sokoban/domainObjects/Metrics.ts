export class Metrics {
    moveCount           = 0
    pushCount           = 0
    boxLineCount        = 0
    boxChangeCount      = 0
    pushingSessionCount = 0
    playerLineCount     = 0

    /** Returns a clone of this `Metrics` */
    clone(): Metrics {
        return Object.assign(new Metrics(), this)
    }
}