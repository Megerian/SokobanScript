import {CommonSkinFormatBase} from "./CommonSkinFormatBase"

/**
 * The KenBriSkin from Brian Damgaard.
 */
export class KenBriSkin extends CommonSkinFormatBase {

    protected topBorder	   = 0
    protected bottomBorder = 0
    protected leftBorder   = 0
    protected rightBorder  = 0

    protected mainImagesFile = this.skinsPath + "/BrianDamgaard/KenBri/Kenney Vleugels - Brian Damgaard.png"
    protected wallImagesFile = this.skinsPath + "/BrianDamgaard/KenBri/Kenney Vleugels - Brian Damgaard - walls.png"

    protected imageSize = 128
    protected animationGraphicCount = 4
    protected skinHasDirectionGraphics = true
    defaultAnimationDelayInMs = 150
}