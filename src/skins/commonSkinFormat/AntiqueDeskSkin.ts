import {CommonSkinFormatBase} from "./CommonSkinFormatBase"

/**
 * The AntiqueDeskSkin from Gerry Wiseman.
 */
export class AntiqueDeskSkin extends CommonSkinFormatBase {

    protected topBorder	   = 0
    protected bottomBorder = 5
    protected leftBorder   = 0
    protected rightBorder  = 5

    protected mainImagesFile = this.skinsPath + "/Gerry/AntiqueDesk/AntiqueDesk.png"
    protected wallImagesFile = this.skinsPath + "/Gerry/AntiqueDesk/AntiqueDesk walls.png"

    protected imageSize = 50

    protected playerInViewDirectionSpritesY       = 4 // row in the skin graphic where the directional player graphics are located
    protected playerOnGoalInViewDirectionSpritesY = 5 // row in the skin graphic where the directional player on goal graphics are located

    protected animationGraphicCount = 7
    protected playerAnimationSpritesY       = 6  // row in the skin graphic where the player animation graphics are located
    protected playerOnGoalAnimationSpritesY = 7  // row in the skin graphic where the player on goal animation graphics are located
    protected boxAnimationSpritesY          = 8  // row in the skin graphic where the box animation graphics are located
    protected boxOnGoalAnimationSpritesY    = 9  // row in the skin graphic where the box on goal animation graphics are located

    defaultAnimationDelayInMs = 150
}