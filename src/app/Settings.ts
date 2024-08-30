/**
 * The `Settings` class contains all settings for this app.
 */
import localforage from 'localforage'
import {SKIN_NAME} from "../skins/commonSkinFormat/CommonSkinFormatBase"

export class Settings {

    static DEFAULTS = {
        skinName:                            "KSokoban2",
        graphicSize:                          "auto",
        moveAnimationDelayMs:                 50,
        selectedObjectAnimationsSpeedPercent: 100,
        showAnimationFlag:                    true,
        hideWallsFlag:                        false,
        soundEnabled:                         true,
        reachablePositionColor:               '#FFFFFFEF',
        backgroundColor:                      "#EBEDEF",
        backgroundImageName:                  ""
    }

    /**
     * Localforage access is slow, hence, all settings are also stored as class members.
     * These are also the default values.
     */
    private static skinName_: SKIN_NAME = "KSokoban2"            // Name of the skin used for visually representing a level board
    private static graphicSize_: string = "auto"                 // size of the skin graphics in pixels or "auto" for automatic size
    private static moveAnimationDelayMs_ = 50                    // Animation delay for moving the player/box in milliseconds
    private static selectedObjectAnimationsSpeedPercent_ = 100   // Animation speed for showing an animation for the selected player/box in % of default speed
    private static showAnimationFlag_ = true                     // Flag indicating whether animations for a selected objects are to be shown
    private static hideWallsFlag_ = false                        // Flag indicating whether walls are to be drawn
    private static soundEnabled_ = true                          // Flag indicating whether sounds are to be played
    private static reachablePositionColor_ = '#FFFFFFEF'         // Background color
    private static backgroundColor_ = "#EBEDEF"                  // Background color
    private static backgroundImageName_ = ""                     // Name of the image to be used as a background or the empty string for "show background color"
    private static lastPlayedCollectionName_ = ""                // The last collection that has been played
    private static lastPlayedLevelNumber_ = 1                    // The last played level number in "lastPlayedCollectionName"

    /** Skin name */
    static get skinName() { return this.skinName_ }
    static set skinName(skinName: SKIN_NAME) {
        Settings.skinName_ = skinName
        localforage.setItem('skinName', skinName).catch(function(err) { console.log(err) })
    }

    /** Skin graphicSize */
    static get graphicSize() { return this.graphicSize_ }
    static set graphicSize(graphicSize: string) {
        Settings.graphicSize_ = graphicSize
        localforage.setItem('graphicSize', graphicSize).catch(function(err) { console.log(err) })
    }

    /** Move animation delay in milli seconds */
    static get moveAnimationDelayMs() { return this.moveAnimationDelayMs_ }
    static set moveAnimationDelayMs(moveAnimationDelayMs: number) {
        Settings.moveAnimationDelayMs_ = moveAnimationDelayMs
        localforage.setItem('moveAnimationDelayMs', moveAnimationDelayMs).catch(function(err) { console.log(err) })
    }

    /** Selected object animation delay in milliseconds */
    static get selectedObjectAnimationsSpeedPercent() { return this.selectedObjectAnimationsSpeedPercent_ }
    static set selectedObjectAnimationsSpeedPercent(selectedObjectAnimationsSpeedPercent: number) {
        Settings.selectedObjectAnimationsSpeedPercent_ = selectedObjectAnimationsSpeedPercent
        localforage.setItem('selectedObjectAnimationsSpeedPercent', selectedObjectAnimationsSpeedPercent).catch(function(err) { console.log(err) })
    }

    /** hideWallsFlag */
    static get hideWallsFlag() { return this.hideWallsFlag_ }
    static set hideWallsFlag(hideWallsFlag: boolean) {
        Settings.hideWallsFlag_ = hideWallsFlag
        localforage.setItem('hideWallsFlag', hideWallsFlag).catch(function(err) { console.log(err) })
    }

    /** Show animation flag */
    static get showAnimationFlag() { return this.showAnimationFlag_ }
    static set showAnimationFlag(showAnimationFlag: boolean) {
        Settings.showAnimationFlag_ = showAnimationFlag
        localforage.setItem('showAnimationFlag', showAnimationFlag).catch(function(err) { console.log(err) })
    }

    /** Sound enabled flag */
    static get soundEnabled() { return this.soundEnabled_ }
    static set soundEnabled(soundEnabled: boolean) {
        Settings.soundEnabled_ = soundEnabled
        localforage.setItem('soundEnabled', soundEnabled).catch(function(err) { console.log(err) })
    }

    /** Background color */
    static get reachablePositionColor() { return this.reachablePositionColor_ }
    static set reachablePositionColor(reachablePositionColor: string) {
        Settings.reachablePositionColor_ = reachablePositionColor
        localforage.setItem('backgroundColor', reachablePositionColor).catch(function(err) { console.log(err) })
    }

    /** Background color */
    static get backgroundColor() { return this.backgroundColor_ }
    static set backgroundColor(backgroundColor: string) {
        Settings.backgroundColor_ = backgroundColor
        localforage.setItem('backgroundColor', backgroundColor).catch(function(err) { console.log(err) })
    }

    /** Background image name */
    static get backgroundImageName() { return this.backgroundImageName_ }
    static set backgroundImageName(backgroundImageName: string) {
        Settings.backgroundImageName_ = backgroundImageName
        localforage.setItem('backgroundImageName', backgroundImageName).catch(function(err) { console.log(err) })
    }

    /** Last played collection */
    static get lastPlayedCollectionName() { return this.lastPlayedCollectionName_ }
    static set lastPlayedCollectionName(lastPlayedCollection: string) {
        Settings.lastPlayedCollectionName_ = lastPlayedCollection
        localforage.setItem('lastPlayedCollection', lastPlayedCollection).catch(function(err) { console.log(err) })
    }

    /** Last played level number */
    static get lastPlayedLevelNumber() { return this.lastPlayedLevelNumber_ }
    static set lastPlayedLevelNumber(lastPlayedLevelNumber: number) {
        Settings.lastPlayedLevelNumber_ = lastPlayedLevelNumber
        localforage.setItem('lastPlayedLevelNumber', lastPlayedLevelNumber).catch(function(err) { console.log(err) })
    }

    /** Loads the settings from the browser storage. */
    static async loadSettings() {
        Settings.skinName_                     = await localforage.getItem<SKIN_NAME>('skinName')          ?? Settings.DEFAULTS.skinName as SKIN_NAME
        Settings.graphicSize_                  = await localforage.getItem<string>('graphicSize')          ?? Settings.DEFAULTS.graphicSize
        Settings.moveAnimationDelayMs_         = await localforage.getItem<number>('moveAnimationDelayMs') ?? Settings.DEFAULTS.moveAnimationDelayMs
        Settings.selectedObjectAnimationsSpeedPercent = await localforage.getItem<number>('selectedObjectAnimationsSpeedPercent') ?? Settings.DEFAULTS.selectedObjectAnimationsSpeedPercent
        Settings.showAnimationFlag_            = await localforage.getItem<boolean>('showAnimationFlag')   ?? Settings.DEFAULTS.showAnimationFlag
        Settings.hideWallsFlag_                = await localforage.getItem<boolean>('hideWallsFlag')       ?? Settings.DEFAULTS.hideWallsFlag
        Settings.soundEnabled_                 = await localforage.getItem<boolean>('soundEnabled')        ?? Settings.DEFAULTS.soundEnabled
        Settings.backgroundColor_              = await localforage.getItem<string>('backgroundColor')      ?? Settings.DEFAULTS.backgroundColor
        Settings.backgroundImageName           = await localforage.getItem<string>('backgroundImageName')  ?? Settings.DEFAULTS.backgroundImageName
    }
}