import {CommonSkinFormatBase} from "./CommonSkinFormatBase"

/**
 * The KenBriSkin from Brian Damgaard.
 */
export class KenBriSkin extends CommonSkinFormatBase {

    protected topBorder	   = 0
    protected bottomBorder = 0
    protected leftBorder   = 0
    protected rightBorder  = 0

    protected mainImagesFile = this.skinsPath + "/BrianDamgaard/KenBri/Kenney Vleugels - Brian Damgaard.png"
    protected wallImagesFile = this.skinsPath + "/BrianDamgaard/KenBri/Kenney Vleugels - Brian Damgaard - walls.png"

    protected imageSize = 128

    protected playerInViewDirectionSpritesY       = 4 // row in the skin graphic where the directional player graphics are located
    protected playerOnGoalInViewDirectionSpritesY = 5 // row in the skin graphic where the directional player on goal graphics are located

    protected animationGraphicCount = 4
    protected boxAnimationSpritesY          = 6  // row in the skin graphic where the box animation graphics are located
    protected boxOnGoalAnimationSpritesY    = 7  // row in the skin graphic where the box on goal animation graphics are located

    defaultAnimationDelayInMs = 150
}