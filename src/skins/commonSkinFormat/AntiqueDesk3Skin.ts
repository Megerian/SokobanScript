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
    protected skinHasDirectionGraphics = false
    defaultAnimationDelayInMs = 150
}