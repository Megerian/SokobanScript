import {CommonSkinFormatBase} from "./CommonSkinFormatBase"

/**
 * The AntiqueDesk3Skin from Gerry Wiseman.
 */
export class AntiqueDesk3Skin extends CommonSkinFormatBase {

    protected topBorder	   = 0
    protected bottomBorder = 0
    protected leftBorder   = 0
    protected rightBorder  = 0

    protected mainImagesFile = this.skinsPath + "/Gerry/AntiqueDesk3/AntiqueDesk3.png"
    protected wallImagesFile = this.skinsPath + "/Gerry/AntiqueDesk3/AntiqueDesk3 walls.png"

    protected imageSize = 50

    protected animationGraphicCount = 7
    protected playerAnimationSpritesY       = 4  // row in the skin graphic where the player animation graphics are located
    protected playerOnGoalAnimationSpritesY = 5  // row in the skin graphic where the player on goal animation graphics are located
    protected boxAnimationSpritesY          = 6  // row in the skin graphic where the box animation graphics are located
    protected boxOnGoalAnimationSpritesY    = 7  // row in the skin graphic where the box on goal animation graphics are located

    defaultAnimationDelayInMs = 150
}