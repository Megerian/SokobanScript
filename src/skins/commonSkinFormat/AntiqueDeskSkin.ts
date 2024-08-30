import {CommonSkinFormatBase} from "./CommonSkinFormatBase"

/**
 * The NightShift3Skin from Gerry Wiseman.
 */
export class AntiqueDeskSkin extends CommonSkinFormatBase {

    protected topBorder	   = 0
    protected bottomBorder = 5
    protected leftBorder   = 0
    protected rightBorder  = 5

    protected mainImagesFile = this.skinsPath + "/Gerry/AntiqueDesk/AntiqueDesk.png"
    protected wallImagesFile = this.skinsPath + "/Gerry/AntiqueDesk/AntiqueDesk walls.png"

    protected imageSize = 50
    protected animationGraphicCount = 7
    protected skinHasDirectionGraphics = true
    defaultAnimationDelayInMs = 150
}