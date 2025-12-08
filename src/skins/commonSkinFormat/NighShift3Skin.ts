import {CommonSkinFormatBase} from "./CommonSkinFormatBase"

/**
 * The NightShift3Skin from Gerry Wiseman.
 */
export class NightShift3Skin extends CommonSkinFormatBase {

    protected topBorder    = 4
    protected bottomBorder = 9
    protected leftBorder   = 4
    protected rightBorder  = 9

    protected mainImagesFile = this.skinsPath + "/Gerry/NightShift3/NightShift3.png"
    protected wallImagesFile = this.skinsPath + "/Gerry/NightShift3/NightShift3 walls.png"

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