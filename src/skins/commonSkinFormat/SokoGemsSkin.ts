import {CommonSkinFormatBase} from "./CommonSkinFormatBase"

/**
 * The NightShift3Skin from Gerry Wiseman.
 */
export class SokoGemsSkin extends CommonSkinFormatBase {

    protected topBorder	   = 6
    protected bottomBorder = 8
    protected leftBorder   = 7
    protected rightBorder  = 7

    protected mainImagesFile = this.skinsPath + "/Gerry/SokoGems/SokoGems.png"
    protected wallImagesFile = this.skinsPath + "/Gerry/SokoGems/SokoGems walls.png"

    protected imageSize = 50
    protected animationGraphicCount = 4
    protected skinHasDirectionGraphics = false
    defaultAnimationDelayInMs = 250
}