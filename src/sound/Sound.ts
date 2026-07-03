import { Settings } from "../app/Settings"

export class Sound {

    private static _moveSound: HTMLAudioElement | null = null
    private static _pushSound: HTMLAudioElement | null = null
    private static _pushToGoalSound: HTMLAudioElement | null = null
    private static _moveBlockedSound: HTMLAudioElement | null = null
    private static _solvedSound: HTMLAudioElement | null = null

    private static get moveSoundElement(): HTMLAudioElement {
        if (!this._moveSound) {
            this._moveSound = document.getElementById('moveSound') as HTMLAudioElement
        }
        return this._moveSound
    }

    private static get pushSoundElement(): HTMLAudioElement {
        if (!this._pushSound) {
            this._pushSound = document.getElementById('pushSound') as HTMLAudioElement
        }
        return this._pushSound
    }

    private static get pushToGoalSoundElement(): HTMLAudioElement {
        if (!this._pushToGoalSound) {
            this._pushToGoalSound = document.getElementById('pushToGoalSound') as HTMLAudioElement
        }
        return this._pushToGoalSound
    }

    private static get moveBlockedSoundElement(): HTMLAudioElement {
        if (!this._moveBlockedSound) {
            this._moveBlockedSound = document.getElementById('moveBlockedSound') as HTMLAudioElement
        }
        return this._moveBlockedSound
    }

    private static get solvedSoundElement(): HTMLAudioElement {
        if (!this._solvedSound) {
            this._solvedSound = document.getElementById('solvedSound') as HTMLAudioElement
        }
        return this._solvedSound
    }

    /** Plays the sound for a move of the player which results in a push. */
    static playMoveSound(): void {
        if (Settings.soundEnabled) {
            const audio = this.moveSoundElement
            if (audio) {
                audio.currentTime = 0
                audio.play().catch(() => {})
            }
        }
    }

    /** Plays the sound for a move of the player which results in a push. */
    static playPushSound(): void {
        if (Settings.soundEnabled) {
            const audio = this.pushSoundElement
            if (audio) {
                audio.currentTime = 0
                audio.play().catch(() => {})
            }
        }
    }

    /** Plays the sound for a move of the player which pushes a box to a goal. */
    static playPushToGoalSound(): void {
        if (Settings.soundEnabled) {
            const audio = this.pushToGoalSoundElement
            if (audio) {
                audio.currentTime = 0
                audio.play().catch(() => {})
            }
        }
    }

    static playMoveBlockedSound(): void {
        if (Settings.soundEnabled) {
            const audio = this.moveBlockedSoundElement
            if (audio) {
                audio.currentTime = 0
                audio.play().catch(() => {})
            }
        }
    }

    static playPuzzleSolvedSound(): void {
        if (Settings.soundEnabled) {
            const audio = this.solvedSoundElement
            if (audio) {
                audio.currentTime = 0
                audio.play().catch(() => {})
            }
        }
    }
}