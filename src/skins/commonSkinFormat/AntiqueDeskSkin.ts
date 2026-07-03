import {CommonSkinFormatBase} from "./CommonSkinFormatBase"

/**
 * The AntiqueDeskSkin from Gerry Wiseman.
 */
export class AntiqueDeskSkin extends CommonSkinFormatBase {

    protected readonly topBorder    = 0
    protected readonly bottomBorder = 5
    protected readonly leftBorder   = 0
    protected readonly rightBorder  = 5

    protected readonly mainImagesFile = this.skinsPath + "/Gerry/AntiqueDesk/AntiqueDesk.png"
    protected readonly wallImagesFile = this.skinsPath + "/Gerry/AntiqueDesk/AntiqueDesk walls.png"

    protected readonly imageSize = 50

    protected readonly playerInViewDirectionSpritesY       = 4 // row in the skin graphic where the directional player graphics are located
    protected readonly playerOnGoalInViewDirectionSpritesY = 5 // row in the skin graphic where the directional player on goal graphics are located

    protected readonly animationGraphicCount = 7
    protected readonly playerAnimationSpritesY       = 6  // row in the skin graphic where the player animation graphics are located
    protected readonly playerOnGoalAnimationSpritesY = 7  // row in the skin graphic where the player on goal animation graphics are located
    protected readonly boxAnimationSpritesY          = 8  // row in the skin graphic where the box animation graphics are located
    protected readonly boxOnGoalAnimationSpritesY    = 9  // row in the skin graphic where the box on goal animation graphics are located

    public readonly defaultAnimationDelayInMs = 150
}