/**
 * The `Settings` class contains all configurable settings for this app.
 * Values are cached in static fields for quick access and persisted using localforage.
 */
import localforage from "localforage"
import { type SKIN_NAME } from "../skins/commonSkinFormat/CommonSkinFormatBase"

export class Settings {

    /**
     * Default values for all settings.
     */
    static DEFAULTS = {
        skinName:                             "KSokoban2",
        graphicSize:                          "auto",
        moveAnimationDelayMs:                 50,
        selectedObjectAnimationsSpeedPercent: 100,
        showAnimationFlag:                    true,
        showCheckerboardPatternFlag:          false,
        hideWallsFlag:                        false,
        soundEnabled:                         true,
        reachablePositionColor:               "#FFFFFFEF",
        backgroundColor:                      "#EBEDEF",
        backgroundImageName:                  "",
        showSnapshotListFlag:                 true,
        showRulerFlag:                        false,
        lastPlayedCollectionName:             "",
        lastPlayedPuzzleNumber:               1,
        letslogicApiKey:                      ""
    }

    /**
     * Localforage access is relatively slow, therefore all settings
     * are also stored as static class members. These are initialized
     * with default values and are updated when `loadSettings()` is called.
     */
    private static skinName_: SKIN_NAME = "KSokoban2"          // Name of the skin used to visually represent the puzzle board
    private static graphicSize_: string = "auto"               // Size of the skin graphics in pixels or "auto" for automatic size
    private static moveAnimationDelayMs_ = 50                  // Animation delay for moving the player/box in milliseconds
    private static selectedObjectAnimationsSpeedPercent_ = 100 // Animation speed for selected player/box in % of default speed
    private static showAnimationFlag_ = true                   // Whether animations for selected objects are shown
    private static showCheckerboardPatternFlag_ = false        // Whether to draw the board with a checkerboard pattern
    private static hideWallsFlag_ = false                      // Whether walls are drawn
    private static soundEnabled_ = true                        // Whether sounds are played
    private static reachablePositionColor_ = "#FFFFFFEF"       // Color used to draw reachable positions
    private static backgroundColor_ = "#EBEDEF"                // Background color of the page
    private static backgroundImageName_ = ""                   // File name of background image or empty string for plain color
    private static showSnapshotListFlag_ = true                // Whether the snapshot/solution sidebar is visible
    private static showRulerFlag_ = false                      // Whether the coordinate ruler (A/B/C, 1/2/3) is visible
    private static lastPlayedCollectionName_ = ""              // Name of the last played collection
    private static lastPlayedPuzzleNumber_ = 1                 // Number of the last played puzzle in the last played collection
    private static letslogicApiKey_ = ""                       // API key used to submit solutions to Letslogic

    // ---------------------------------------------------------------------
    // Skin
    // ---------------------------------------------------------------------

    /** Skin name */
    static get skinName(): SKIN_NAME {
        return this.skinName_
    }

    static set skinName(skinName: SKIN_NAME) {
        Settings.skinName_ = skinName
        localforage.setItem("skinName", skinName).catch(err => console.log(err))
    }

    // ---------------------------------------------------------------------
    // Graphic size
    // ---------------------------------------------------------------------

    /** Skin graphic size */
    static get graphicSize(): string {
        return this.graphicSize_
    }

    static set graphicSize(graphicSize: string) {
        Settings.graphicSize_ = graphicSize
        localforage.setItem("graphicSize", graphicSize).catch(err => console.log(err))
    }

    // ---------------------------------------------------------------------
    // Animation settings
    // ---------------------------------------------------------------------

    /** Move animation delay in milliseconds */
    static get moveAnimationDelayMs(): number {
        return this.moveAnimationDelayMs_
    }

    static set moveAnimationDelayMs(moveAnimationDelayMs: number) {
        Settings.moveAnimationDelayMs_ = moveAnimationDelayMs
        localforage.setItem("moveAnimationDelayMs", moveAnimationDelayMs).catch(err => console.log(err))
    }

    /** Selected object animation speed in percent (relative to default speed) */
    static get selectedObjectAnimationsSpeedPercent(): number {
        return this.selectedObjectAnimationsSpeedPercent_
    }

    static set selectedObjectAnimationsSpeedPercent(value: number) {
        Settings.selectedObjectAnimationsSpeedPercent_ = value
        localforage.setItem("selectedObjectAnimationsSpeedPercent", value).catch(err => console.log(err))
    }

    /** Whether walls are hidden */
    static get hideWallsFlag(): boolean {
        return this.hideWallsFlag_
    }

    static set hideWallsFlag(hideWallsFlag: boolean) {
        Settings.hideWallsFlag_ = hideWallsFlag
        localforage.setItem("hideWallsFlag", hideWallsFlag).catch(err => console.log(err))
    }

    /** Whether animations are shown */
    static get showAnimationFlag(): boolean {
        return this.showAnimationFlag_
    }

    static set showAnimationFlag(showAnimationFlag: boolean) {
        Settings.showAnimationFlag_ = showAnimationFlag
        localforage.setItem("showAnimationFlag", showAnimationFlag).catch(err => console.log(err))
    }

    /** Whether the board is drawn with a checkerboard pattern */
    static get showCheckerboardPatternFlag(): boolean {
        return this.showCheckerboardPatternFlag_
    }

    static set showCheckerboardPatternFlag(showCheckerboardPatternFlag: boolean) {
        Settings.showCheckerboardPatternFlag_ = showCheckerboardPatternFlag
        localforage.setItem("showCheckerboardPatternFlag", showCheckerboardPatternFlag).catch(err => console.log(err))
    }

    // ---------------------------------------------------------------------
    // Sound
    // ---------------------------------------------------------------------

    /** Whether sound effects are enabled */
    static get soundEnabled(): boolean {
        return this.soundEnabled_
    }

    static set soundEnabled(soundEnabled: boolean) {
        Settings.soundEnabled_ = soundEnabled
        localforage.setItem("soundEnabled", soundEnabled).catch(err => console.log(err))
    }

    // ---------------------------------------------------------------------
    // Colors / Background
    // ---------------------------------------------------------------------

    /** Color used for reachable positions overlay */
    static get reachablePositionColor(): string {
        return this.reachablePositionColor_
    }

    static set reachablePositionColor(reachablePositionColor: string) {
        Settings.reachablePositionColor_ = reachablePositionColor
        localforage.setItem("reachablePositionColor", reachablePositionColor).catch(err => console.log(err))
    }

    /** Background color of the page */
    static get backgroundColor(): string {
        return this.backgroundColor_
    }

    static set backgroundColor(backgroundColor: string) {
        Settings.backgroundColor_ = backgroundColor
        localforage.setItem("backgroundColor", backgroundColor).catch(err => console.log(err))
    }

    /** Background image file name (empty string = no image) */
    static get backgroundImageName(): string {
        return this.backgroundImageName_
    }

    static set backgroundImageName(backgroundImageName: string) {
        Settings.backgroundImageName_ = backgroundImageName
        localforage.setItem("backgroundImageName", backgroundImageName).catch(err => console.log(err))
    }

    // ---------------------------------------------------------------------
    // Snapshot list visibility
    // ---------------------------------------------------------------------

    /** Whether the snapshot/solution list sidebar is visible */
    static get showSnapshotListFlag(): boolean {
        return this.showSnapshotListFlag_
    }

    static set showSnapshotListFlag(showSnapshotListFlag: boolean) {
        Settings.showSnapshotListFlag_ = showSnapshotListFlag
        localforage.setItem("showSnapshotListFlag", showSnapshotListFlag).catch(err => console.log(err))
    }

    // ---------------------------------------------------------------------
    // Ruler visibility
    // ---------------------------------------------------------------------

    /** Whether the coordinate ruler (A/B/C, 1/2/3) is visible */
    static get showRulerFlag(): boolean {
        return this.showRulerFlag_
    }

    static set showRulerFlag(showRulerFlag: boolean) {
        Settings.showRulerFlag_ = showRulerFlag
        localforage.setItem("showRulerFlag", showRulerFlag).catch(err => console.log(err))
    }

    // ---------------------------------------------------------------------
    // Last played collection / puzzle
    // ---------------------------------------------------------------------

    /** Name of the last played collection */
    static get lastPlayedCollectionName(): string {
        return this.lastPlayedCollectionName_
    }

    static set lastPlayedCollectionName(lastPlayedCollection: string) {
        Settings.lastPlayedCollectionName_ = lastPlayedCollection
        localforage.setItem("lastPlayedCollection", lastPlayedCollection).catch(err => console.log(err))
    }

    /** Number of the last played puzzle in the last played collection */
    static get lastPlayedPuzzleNumber(): number {
        return this.lastPlayedPuzzleNumber_
    }

    static set lastPlayedPuzzleNumber(lastPlayedPuzzleNumber: number) {
        Settings.lastPlayedPuzzleNumber_ = lastPlayedPuzzleNumber
        localforage.setItem("lastPlayedPuzzleNumber", lastPlayedPuzzleNumber).catch(err => console.log(err))
    }

    // ---------------------------------------------------------------------
    // Letslogic
    // ---------------------------------------------------------------------

    /** API key used to submit solutions to Letslogic */
    static get letslogicApiKey(): string {
        return this.letslogicApiKey_
    }

    static set letslogicApiKey(apiKey: string) {
        Settings.letslogicApiKey_ = apiKey
        localforage.setItem("letslogicApiKey", apiKey).catch(err => console.log(err))
    }

    // ---------------------------------------------------------------------
    // Load settings from storage
    // ---------------------------------------------------------------------

    /**
     * Loads all settings from browser storage in parallel and applies them to the
     * static fields. If a setting is not present in storage, the default
     * value from `Settings.DEFAULTS` is used.
     */
    static async loadSettings(): Promise<void> {
        const [
            skinName,
            graphicSize,
            moveAnimationDelayMs,
            selectedObjectAnimationsSpeedPercent,
            showAnimationFlag,
            showCheckerboardPatternFlag,
            hideWallsFlag,
            soundEnabled,
            backgroundColor,
            backgroundImageName,
            showSnapshotListFlag,
            showRulerFlag,
            lastPlayedCollection,
            lastPlayedPuzzleNumber,
            reachablePositionColor,
            letslogicApiKey
        ] = await Promise.all([
            localforage.getItem<SKIN_NAME>("skinName"),
            localforage.getItem<string>("graphicSize"),
            localforage.getItem<number>("moveAnimationDelayMs"),
            localforage.getItem<number>("selectedObjectAnimationsSpeedPercent"),
            localforage.getItem<boolean>("showAnimationFlag"),
            localforage.getItem<boolean>("showCheckerboardPatternFlag"),
            localforage.getItem<boolean>("hideWallsFlag"),
            localforage.getItem<boolean>("soundEnabled"),
            localforage.getItem<string>("backgroundColor"),
            localforage.getItem<string>("backgroundImageName"),
            localforage.getItem<boolean>("showSnapshotListFlag"),
            localforage.getItem<boolean>("showRulerFlag"),
            localforage.getItem<string>("lastPlayedCollection"),
            localforage.getItem<number>("lastPlayedPuzzleNumber"),
            localforage.getItem<string>("reachablePositionColor"),
            localforage.getItem<string>("letslogicApiKey")
        ])

        Settings.skinName_ = skinName ?? (Settings.DEFAULTS.skinName as SKIN_NAME)
        Settings.graphicSize_ = graphicSize ?? Settings.DEFAULTS.graphicSize
        Settings.moveAnimationDelayMs_ = moveAnimationDelayMs ?? Settings.DEFAULTS.moveAnimationDelayMs
        Settings.selectedObjectAnimationsSpeedPercent_ = selectedObjectAnimationsSpeedPercent ?? Settings.DEFAULTS.selectedObjectAnimationsSpeedPercent
        Settings.showAnimationFlag_ = showAnimationFlag ?? Settings.DEFAULTS.showAnimationFlag
        Settings.showCheckerboardPatternFlag_ = showCheckerboardPatternFlag ?? Settings.DEFAULTS.showCheckerboardPatternFlag
        Settings.hideWallsFlag_ = hideWallsFlag ?? Settings.DEFAULTS.hideWallsFlag
        Settings.soundEnabled_ = soundEnabled ?? Settings.DEFAULTS.soundEnabled
        Settings.backgroundColor_ = backgroundColor ?? Settings.DEFAULTS.backgroundColor
        Settings.backgroundImageName_ = backgroundImageName ?? Settings.DEFAULTS.backgroundImageName
        Settings.showSnapshotListFlag_ = showSnapshotListFlag ?? Settings.DEFAULTS.showSnapshotListFlag
        Settings.showRulerFlag_ = showRulerFlag ?? Settings.DEFAULTS.showRulerFlag
        Settings.lastPlayedCollectionName_ = lastPlayedCollection ?? Settings.DEFAULTS.lastPlayedCollectionName
        Settings.lastPlayedPuzzleNumber_ = lastPlayedPuzzleNumber ?? Settings.DEFAULTS.lastPlayedPuzzleNumber
        Settings.reachablePositionColor_ = reachablePositionColor ?? Settings.DEFAULTS.reachablePositionColor
        Settings.letslogicApiKey_ = letslogicApiKey ?? Settings.DEFAULTS.letslogicApiKey
    }
}