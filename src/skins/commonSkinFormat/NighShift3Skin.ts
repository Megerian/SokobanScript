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
    protected animationGraphicCount = 7
    protected skinHasDirectionGraphics = true
    defaultAnimationDelayInMs = 150
}