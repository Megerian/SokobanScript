import {CommonSkinFormatBase} from "./CommonSkinFormatBase"

/**
 * The NightShift3Skin from Gerry Wiseman.
 */
export class KSokobanSkin extends CommonSkinFormatBase {

    protected topBorder	   = 0
    protected bottomBorder = 0
    protected leftBorder   = 0
    protected rightBorder  = 0

    protected mainImagesFile = this.skinsPath + "/KSokoban/KSokoban.png"
    protected wallImagesFile = this.skinsPath + "/KSokoban/KSokoban walls.png"

    protected imageSize = 56
    protected animationGraphicCount = 0
    protected skinHasDirectionGraphics = false
    defaultAnimationDelayInMs = 150
}