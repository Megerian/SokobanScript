import { CommonSkinFormatBase } from "./CommonSkinFormatBase"

/**
 * The AntiqueDesk3Skin from Gerry Wiseman.
 */
export class AntiqueDesk3Skin extends CommonSkinFormatBase {

    protected readonly topBorder    = 0
    protected readonly bottomBorder = 0
    protected readonly leftBorder   = 0
    protected readonly rightBorder  = 0

    protected readonly mainImagesFile = this.skinsPath + "/Gerry/AntiqueDesk3/AntiqueDesk3.png"
    protected readonly wallImagesFile = this.skinsPath + "/Gerry/AntiqueDesk3/AntiqueDesk3 walls.png"

    protected readonly imageSize = 50

    protected readonly animationGraphicCount = 7
    protected readonly playerAnimationSpritesY       = 4  // row in the skin graphic where the player animation graphics are located
    protected readonly playerOnGoalAnimationSpritesY = 5  // row in the skin graphic where the player on goal animation graphics are located
    protected readonly boxAnimationSpritesY          = 6  // row in the skin graphic where the box animation graphics are located
    protected readonly boxOnGoalAnimationSpritesY    = 7  // row in the skin graphic where the box on goal animation graphics are located

    public readonly defaultAnimationDelayInMs = 150
}