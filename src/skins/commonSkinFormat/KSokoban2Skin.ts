import { CommonSkinFormatBase } from "./CommonSkinFormatBase"

/**
 * The KSokoban2Skin.
 */
export class KSokoban2Skin extends CommonSkinFormatBase {

    protected readonly topBorder    = 0
    protected readonly bottomBorder = 0
    protected readonly leftBorder   = 0
    protected readonly rightBorder  = 0

    protected readonly mainImagesFile = this.skinsPath + "/KSokoban2/KSokoban.png"
    protected readonly wallImagesFile = this.skinsPath + "/KSokoban2/KSokoban walls.png"

    protected readonly imageSize = 96

    protected readonly animationGraphicCount = 4
    protected readonly playerAnimationSpritesY       = 4  // row in the skin graphic where the player animation graphics are located
    protected readonly playerOnGoalAnimationSpritesY = 5  // row in the skin graphic where the player on goal animation graphics are located
    protected readonly boxAnimationSpritesY          = 6  // row in the skin graphic where the box animation graphics are located
    protected readonly boxOnGoalAnimationSpritesY    = 7  // row in the skin graphic where the box on goal animation graphics are located

    public readonly defaultAnimationDelayInMs = 150
    public readonly useAlphaBlendingForAnimations = false // alpha blending would worsen the result for this skin
}