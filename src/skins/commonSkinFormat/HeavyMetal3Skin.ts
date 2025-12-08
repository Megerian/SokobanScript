import {CommonSkinFormatBase} from "./CommonSkinFormatBase"

/**
 * The HeavyMetal3Skin from Gerry Wiseman.
 */
export class HeavyMetal3Skin extends CommonSkinFormatBase {

    protected topBorder	   = 5
    protected bottomBorder = 7
    protected leftBorder   = 5
    protected rightBorder  = 7

    protected mainImagesFile = this.skinsPath + "/Gerry/HeavyMetal3/HeavyMetal3.png"
    protected wallImagesFile = this.skinsPath + "/Gerry/HeavyMetal3/HeavyMetal3 walls.png"

    protected imageSize = 50

    protected animationGraphicCount = 4
    protected playerAnimationSpritesY       = 4  // row in the skin graphic where the player animation graphics are located
    protected playerOnGoalAnimationSpritesY = 5  // row in the skin graphic where the player on goal animation graphics are located
    protected boxAnimationSpritesY          = 6  // row in the skin graphic where the box animation graphics are located
    protected boxOnGoalAnimationSpritesY    = 7  // row in the skin graphic where the box on goal animation graphics are located

    defaultAnimationDelayInMs = 150
}