import {CommonSkinFormatBase} from "./CommonSkinFormatBase"

/**
 * The HeavyMetal3Skin from Gerry Wiseman.
 */
export class HeavyMetal3Skin extends CommonSkinFormatBase {

    protected topBorder	   = 5
    protected bottomBorder = 7
    protected leftBorder   = 5
    protected rightBorder  = 7

    protected mainImagesFile = this.skinsPath + "/Gerry/HeavyMetal3/HeavyMetal3.png"
    protected wallImagesFile = this.skinsPath + "/Gerry/HeavyMetal3/HeavyMetal3 walls.png"

    protected imageSize = 50
    protected animationGraphicCount = 4
    protected skinHasDirectionGraphics = false
    defaultAnimationDelayInMs = 150
}