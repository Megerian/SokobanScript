import { CommonSkinFormatBase } from "./CommonSkinFormatBase"

/**
 * The KenBriSkin from Brian Damgaard.
 */
export class KenBriSkin extends CommonSkinFormatBase {

    protected readonly topBorder    = 0
    protected readonly bottomBorder = 0
    protected readonly leftBorder   = 0
    protected readonly rightBorder  = 0

    protected readonly mainImagesFile = this.skinsPath + "/BrianDamgaard/KenBri/Kenney Vleugels - Brian Damgaard.png"
    protected readonly wallImagesFile = this.skinsPath + "/BrianDamgaard/KenBri/Kenney Vleugels - Brian Damgaard - walls.png"

    protected readonly imageSize = 128

    protected readonly playerInViewDirectionSpritesY       = 4 // row in the skin graphic where the directional player graphics are located
    protected readonly playerOnGoalInViewDirectionSpritesY = 5 // row in the skin graphic where the directional player on goal graphics are located

    protected readonly animationGraphicCount = 4
    protected readonly boxAnimationSpritesY          = 6  // row in the skin graphic where the box animation graphics are located
    protected readonly boxOnGoalAnimationSpritesY    = 7  // row in the skin graphic where the box on goal animation graphics are located

    public readonly defaultAnimationDelayInMs = 150
}