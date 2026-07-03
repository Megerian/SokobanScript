import { CommonSkinFormatBase } from "./CommonSkinFormatBase"

/**
 * The NightShift3Skin from Gerry Wiseman.
 */
export class NightShift3Skin extends CommonSkinFormatBase {

    protected readonly topBorder    = 4
    protected readonly bottomBorder = 9
    protected readonly leftBorder   = 4
    protected readonly rightBorder  = 9

    protected readonly mainImagesFile = this.skinsPath + "/Gerry/NightShift3/NightShift3.png"
    protected readonly wallImagesFile = this.skinsPath + "/Gerry/NightShift3/NightShift3 walls.png"

    protected readonly imageSize = 50

    protected readonly playerInViewDirectionSpritesY       = 4 // row in the skin graphic where the directional player graphics are located
    protected readonly playerOnGoalInViewDirectionSpritesY = 5 // row in the skin graphic where the directional player on goal graphics are located

    protected readonly animationGraphicCount = 7

    protected readonly playerAnimationSpritesY       = 6  // row in the skin graphic where the player animation graphics are located
    protected readonly playerOnGoalAnimationSpritesY = 7  // row in the skin graphic where the player on goal animation graphics are located
    protected readonly boxAnimationSpritesY          = 8  // row in the skin graphic where the box animation graphics are located
    protected readonly boxOnGoalAnimationSpritesY    = 9  // row in the skin graphic where the box on goal animation graphics are located

    public readonly defaultAnimationDelayInMs = 150
}