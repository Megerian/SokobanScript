import {CommonSkinFormatBase} from "./commonSkinFormat/CommonSkinFormatBase";
import {AntiqueDeskSkin} from "./commonSkinFormat/AntiqueDeskSkin";
import {AntiqueDesk3Skin} from "./commonSkinFormat/AntiqueDesk3Skin";
import {NightShift3Skin} from "./commonSkinFormat/NighShift3Skin";
import {HeavyMetal3Skin} from "./commonSkinFormat/HeavyMetal3Skin";
import {SokoGemsSkin} from "./commonSkinFormat/SokoGemsSkin";
import {KSokobanSkin} from "./commonSkinFormat/KSokobanSkin";
import {KSokoban2Skin} from "./commonSkinFormat/KSokoban2Skin";
import {KenBriSkin} from "./commonSkinFormat/KenBriSkin";

export class SkinLoader {

    /**
     * Returns the `Skin` for the passed skinName.
     * @param skinName  the name of the skin to be returned
     */
    static async loadSkinByName(skinName: string): Promise<CommonSkinFormatBase> {

        let skin: CommonSkinFormatBase = new NightShift3Skin() // default skin

        switch(skinName) {

            case "AntiqueDesk": skin = new AntiqueDeskSkin()
                break

            case "AntiqueDesk3": skin = new AntiqueDesk3Skin()
                break

            case "NightShift3": skin = new NightShift3Skin()
                break

            case "HeavyMetal3": skin = new HeavyMetal3Skin()
                break

            case "SokoGems": skin = new SokoGemsSkin()
                break

            case "KSokoban": skin = new KSokobanSkin()
                break

            case "KSokoban2": skin = new KSokoban2Skin()
                break

            case "KenBri": skin = new KenBriSkin()
                break
        }

        await skin.loadImages()

        return skin
    }
}