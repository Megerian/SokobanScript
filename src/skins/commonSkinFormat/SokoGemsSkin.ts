import {CommonSkinFormatBase} from "./CommonSkinFormatBase"

/**
 * The SokoGemsSkin.
 */
export class SokoGemsSkin extends CommonSkinFormatBase {

    protected topBorder	   = 6
    protected bottomBorder = 8
    protected leftBorder   = 7
    protected rightBorder  = 7

    protected mainImagesFile = this.skinsPath + "/Gerry/SokoGems/SokoGems.png"
    protected wallImagesFile = this.skinsPath + "/Gerry/SokoGems/SokoGems walls.png"

    protected imageSize = 50

    protected animationGraphicCount = 4
    protected playerAnimationSpritesY       = 4  // row in the skin graphic where the player animation graphics are located
    protected playerOnGoalAnimationSpritesY = 5  // row in the skin graphic where the player on goal animation graphics are located
    protected boxAnimationSpritesY          = 6  // row in the skin graphic where the box animation graphics are located
    protected boxOnGoalAnimationSpritesY    = 7  // row in the skin graphic where the box on goal animation graphics are located

    defaultAnimationDelayInMs = 250
}