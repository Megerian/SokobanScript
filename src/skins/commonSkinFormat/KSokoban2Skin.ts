import {CommonSkinFormatBase} from "./CommonSkinFormatBase"

/**
 * The KSokoban2Skin.
 */
export class KSokoban2Skin extends CommonSkinFormatBase {

    protected topBorder	   = 0
    protected bottomBorder = 0
    protected leftBorder   = 0
    protected rightBorder  = 0

    protected mainImagesFile = this.skinsPath + "/KSokoban2/KSokoban.png"
    protected wallImagesFile = this.skinsPath + "/KSokoban2/KSokoban walls.png"

    protected imageSize = 96

    protected animationGraphicCount = 4
    protected playerAnimationSpritesY       = 4  // row in the skin graphic where the player animation graphics are located
    protected playerOnGoalAnimationSpritesY = 5  // row in the skin graphic where the player on goal animation graphics are located
    protected boxAnimationSpritesY          = 6  // row in the skin graphic where the box animation graphics are located
    protected boxOnGoalAnimationSpritesY    = 7  // row in the skin graphic where the box on goal animation graphics are located

    defaultAnimationDelayInMs = 150
    useAlphaBlendingForAnimations = false // alpha blending would worsen the result for this skin
}