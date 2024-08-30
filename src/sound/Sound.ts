export class Sound {

    public static moveSound = document.getElementById('moveSound') as HTMLAudioElement
    public static pushSound = document.getElementById('pushSound') as HTMLAudioElement
    public static pushToGoalSound = document.getElementById('pushToGoalSound') as HTMLAudioElement
    public static moveBlockedSound = document.getElementById('moveBlockedSound') as HTMLAudioElement
    public static solvedSound = document.getElementById('solvedSound') as HTMLAudioElement


    static playMoveSound() {
        if (this.playSoundEnabled()) {
            this.moveSound.play()
        }
    }

    /** Plays the sound for a move of the player which results in a push. */
    static playPushSound() {
        if (this.playSoundEnabled()) {
            this.pushSound.play()
        }
    }

    /** Plays the sound for a move of the player which pushes a box to a goal. */
    static playPushToGoalSound() {
        if (this.playSoundEnabled()) {
            this.pushToGoalSound.play()
        }
    }

    private static playSoundEnabled(): boolean {
        return (document.getElementById("soundEnabled") as HTMLInputElement).checked
    }

    static playMoveBlockedSound() {
        if (this.playSoundEnabled()) {
            this.moveBlockedSound.play()
        }
    }

    static playLevelSolvedSound() {
        if (this.playSoundEnabled()) {
            this.solvedSound.play()
        }
    }
}