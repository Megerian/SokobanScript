import {CommonSkinFormatBase} from "./CommonSkinFormatBase"

/**
 * The KSokoban2Skin.
 */
export class KSokoban2Skin extends CommonSkinFormatBase {

    protected topBorder	   = 0
    protected bottomBorder = 0
    protected leftBorder   = 0
    protected rightBorder  = 0

    protected mainImagesFile = this.skinsPath + "/KSokoban2/KSokoban.png"
    protected wallImagesFile = this.skinsPath + "/KSokoban2/KSokoban walls.png"

    protected imageSize = 96
    protected animationGraphicCount = 4
    protected skinHasDirectionGraphics  = false
    defaultAnimationDelayInMs = 150
    useAlphaBlendingForAnimations = false // alpha blending would worsen the result for this skin
}