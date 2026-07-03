import { CommonSkinFormatBase } from "./CommonSkinFormatBase"

/**
 * The KSokobanSkin.
 */
export class KSokobanSkin extends CommonSkinFormatBase {

    protected readonly topBorder    = 0
    protected readonly bottomBorder = 0
    protected readonly leftBorder   = 0
    protected readonly rightBorder  = 0

    protected readonly mainImagesFile = this.skinsPath + "/KSokoban/KSokoban.png"
    protected readonly wallImagesFile = this.skinsPath + "/KSokoban/KSokoban walls.png"

    protected readonly imageSize = 56
    protected readonly animationGraphicCount = 0
    public readonly defaultAnimationDelayInMs = 150
}