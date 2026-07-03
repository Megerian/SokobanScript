import { CommonSkinFormatBase } from "./CommonSkinFormatBase"

/**
 * The HeavyMetal3Skin from Gerry Wiseman.
 */
export class HeavyMetal3Skin extends CommonSkinFormatBase {

    protected readonly topBorder    = 5
    protected readonly bottomBorder = 7
    protected readonly leftBorder   = 5
    protected readonly rightBorder  = 7

    protected readonly mainImagesFile = this.skinsPath + "/Gerry/HeavyMetal3/HeavyMetal3.png"
    protected readonly wallImagesFile = this.skinsPath + "/Gerry/HeavyMetal3/HeavyMetal3 walls.png"

    protected readonly imageSize = 50

    protected readonly animationGraphicCount = 4
    protected readonly playerAnimationSpritesY       = 4  // row in the skin graphic where the player animation graphics are located
    protected readonly playerOnGoalAnimationSpritesY = 5  // row in the skin graphic where the player on goal animation graphics are located
    protected readonly boxAnimationSpritesY          = 6  // row in the skin graphic where the box animation graphics are located
    protected readonly boxOnGoalAnimationSpritesY    = 7  // row in the skin graphic where the box on goal animation graphics are located

    public readonly defaultAnimationDelayInMs = 150
}