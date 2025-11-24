import {Board} from "../../board/Board"
import {DIRECTION, DOWN, LEFT, RIGHT, UP} from "../../Sokoban/Directions"
import {NONE} from "../../app/SokobanApp"

/** Supported skins */
export type SKIN_NAME = "AntiqueDesk" | "AntiqueDesk3" | "NightShift3" | "HeavyMetal3" |
                        "SokoGems"    | "KSokoban"     | "KSokoban2"

export abstract class CommonSkinFormatBase {

    protected skinsPath = "/resources/skins"       // path to the skin files

    protected skinImage = new Image()
    protected wallsImage = new Image()

    private dummySprite = new SpriteData(this.skinImage)

    protected  boxSprite             = this.dummySprite
    protected  boxOnGoalSprite       = this.dummySprite
    protected  goalSprite            = this.dummySprite
    protected  floorSprite           = this.dummySprite
    protected  wallSprites           = Array<SpriteData>()
    protected  playerInViewDirectionSprites       = Array<SpriteData>()
    protected  playerOnGoalInViewDirectionSprites = Array<SpriteData>()

    playerSelectedAnimationSprites       = Array<SpriteData>()
    playerOnGoalSelectedAnimationSprites = Array<SpriteData>()
    boxSelectedAnimationSprites          = Array<SpriteData>()
    boxOnGoalSelectedAnimationSprites    = Array<SpriteData>()

    // Data the actual skin classes have to override
    protected abstract topBorder: number
    protected abstract bottomBorder: number
    protected abstract leftBorder: number
    protected abstract rightBorder: number
    abstract defaultAnimationDelayInMs: number
    protected abstract imageSize: number
    protected abstract animationGraphicCount: number      // number of graphics available for showing animations
    protected abstract mainImagesFile: string
    protected abstract wallImagesFile: string
    protected abstract skinHasDirectionGraphics: boolean  // Flag indicating whether the skin supports the player looking in different directions
    useAlphaBlendingForAnimations= true         // Flag indicating whether alpha blending should be used for showing animations

    constructor() { }


    async loadImages() {
        await this.loadImage(this.mainImagesFile).then( image => this.skinImage = image)
            .catch( reason => console.log("Skin file couldn't be loaded: "+this.mainImagesFile))
        await this.loadImage(this.wallImagesFile).then( wallsImage => this.wallsImage = wallsImage)
            .catch( reason => console.log("Skin walls file couldn't be loaded: "+this.wallImagesFile))
        await this.setSpriteImages()
    }

    /** Loads a single image. */
    protected async loadImage(src: string): Promise<HTMLImageElement> {
        return new Promise( (resolve, reject) => {
            const image = new Image()
            image.src = src
            if(image.complete) {
                resolve(image)
            } else {
                image.addEventListener('load', () => resolve(image))
                image.addEventListener('error', error => reject(error))
            }
        })
    }

    /**
     * Creates and returns the SpriteData for the image stored at the given coordinates
     * in the sprite sheet image.
     * @param x
     * @param y
     * @protected
     */
    protected async createSpriteForCoordinates(x: number, y: number): Promise<SpriteData> {
        return await this.createSpriteImage(this.skinImage, x, y)
    }

    /**
     * Creates and returns the SpriteData for the image stored at the given coordinates
     * in the sprite sheet image for the walls.
     * @param x
     * @param y
     * @protected
     */
    protected async createWallSpriteForCoordinates(x: number, y: number): Promise<SpriteData> {
        return await this.createSpriteImage(this.wallsImage, x, y)
    }

    private async createSpriteImage(spriteSheetImage: HTMLImageElement, x: number, y: number): Promise<SpriteData> {
        const canvas = document.createElement("canvas")
        canvas.width = this.getImageSize()
        canvas.height = this.getImageSize()
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(spriteSheetImage, -x * this.imageSize, -y * this.imageSize)

        const image = await this.loadImage(canvas.toDataURL())

        return new SpriteData(image)
    }

    private async setSpriteImages() {
        this.boxSprite              = await this.createSpriteForCoordinates(2, 0)
        this.boxOnGoalSprite        = await this.createSpriteForCoordinates(2,1)

        if(this.skinHasDirectionGraphics) {
            this.playerInViewDirectionSprites = [
                await this.createSpriteForCoordinates(0, 4),   // player up
                await this.createSpriteForCoordinates(2, 4),   // player down
                await this.createSpriteForCoordinates(1, 4),   // player left
                await this.createSpriteForCoordinates(3, 4)]   // player right

            this.playerOnGoalInViewDirectionSprites = [
                await this.createSpriteForCoordinates(0, 5),   // player up
                await this.createSpriteForCoordinates(2, 5),   // player down
                await this.createSpriteForCoordinates(1, 5),   // player left
                await this.createSpriteForCoordinates(3, 5)]   // player right

            // There are four graphics for showing animations for: player, playerOnGoal, box and boxOnGoal.
            for (let x = 0; x < this.animationGraphicCount; x++) {
                if(this.skinsPath.indexOf("KenBri")) {  // special coding for KenBri skin
                    this.playerSelectedAnimationSprites.push(await this.createSpriteForCoordinates(1, 0))   // player down for selected player animation graphics
                    this.playerOnGoalSelectedAnimationSprites.push(await this.createSpriteForCoordinates(1, 1)) // player down for selected player on goal animation graphics
                    this.boxSelectedAnimationSprites.push(await this.createSpriteForCoordinates(x, 6)) // Selected box animation graphics
                    this.boxOnGoalSelectedAnimationSprites.push(await this.createSpriteForCoordinates(x, 7)) // Selected box on goal animation graphics
                } else {
                    this.playerSelectedAnimationSprites.push(await this.createSpriteForCoordinates(x, 6)) // Selected player animation graphics
                    this.playerOnGoalSelectedAnimationSprites.push(await this.createSpriteForCoordinates(x, 7)) // Selected player on goal animation graphics
                    this.boxSelectedAnimationSprites.push(await this.createSpriteForCoordinates(x, 8)) // Selected box animation graphics
                    this.boxOnGoalSelectedAnimationSprites.push(await this.createSpriteForCoordinates(x, 9)) // Selected box on goal animation graphics
                }
            }
        } else {
            this.playerInViewDirectionSprites = [
                await this.createSpriteForCoordinates(1, 0),   // player up
                await this.createSpriteForCoordinates(1, 0),   // player down
                await this.createSpriteForCoordinates(1, 0),   // player left
                await this.createSpriteForCoordinates(1, 0)]   // player right

            this.playerOnGoalInViewDirectionSprites = [
                await this.createSpriteForCoordinates(1, 1),   // player up
                await this.createSpriteForCoordinates(1, 1),   // player down
                await this.createSpriteForCoordinates(1, 1),   // player left
                await this.createSpriteForCoordinates(1, 1)]   // player right

            // There are four graphics for showing animations for: player, playerOnGoal, box and boxOnGoal.
            for (let x = 0; x < this.animationGraphicCount; x++) {
                this.playerSelectedAnimationSprites.push(await this.createSpriteForCoordinates(x, 4))       // Selected player animation graphics
                this.playerOnGoalSelectedAnimationSprites.push(await this.createSpriteForCoordinates(x, 5)) // Selected player on goal animation graphics
                this.boxSelectedAnimationSprites.push(await this.createSpriteForCoordinates(x, 6))          // Selected box animation graphics
                this.boxOnGoalSelectedAnimationSprites.push(await this.createSpriteForCoordinates(x, 7))    // Selected box on goal animation graphics
            }
        }
        this.wallSprites = [
            await this.createWallSpriteForCoordinates(0, 0),   // wall no neighbor
            await this.createWallSpriteForCoordinates(1, 0),   // wall neighbor above
            await this.createWallSpriteForCoordinates(2, 0),   // wall neighbor right
            await this.createWallSpriteForCoordinates(3, 0),   // wall neighbor above+right
            await this.createWallSpriteForCoordinates(4, 0),   // wall neighbor below
            await this.createWallSpriteForCoordinates(5, 0),   // wall neighbor above+below
            await this.createWallSpriteForCoordinates(6, 0),   // wall neighbor right+below
            await this.createWallSpriteForCoordinates(7, 0),   // wall neighbor above+right+below
            await this.createWallSpriteForCoordinates(8, 0),   // wall neighbor left
            await this.createWallSpriteForCoordinates(9, 0),   // wall neighbor above+left
            await this.createWallSpriteForCoordinates(10,0),   // wall neighbor left+right
            await this.createWallSpriteForCoordinates(11,0),   // wall neighbor above+left+right
            await this.createWallSpriteForCoordinates(12,0),   // wall neighbor left+below
            await this.createWallSpriteForCoordinates(13,0),   // wall neighbor above+left+below
            await this.createWallSpriteForCoordinates(14,0),   // wall neighbor left+right+below
            await this.createWallSpriteForCoordinates(15,0),   // wall neighbor above+left+right+below
            await this.createBeautyGraphic(),                        // beauty graphic
        ]

        this.goalSprite  = await this.createSpriteForCoordinates(0,1)
        this.floorSprite = await this.createSpriteForCoordinates(0,0)

        this.createSelectedObjectAnimationBlendingGraphics()
    }

    getImageSize(): number {
        return this.imageSize
    }

    getSprite(board: Board, position: number, viewDirection: DIRECTION): SpriteData {

        switch (board.getXSB_Char(position)) {
            case "$": return this.boxSprite
            case "*": return this.boxOnGoalSprite
            case "@": return this.playerInViewDirectionSprites[viewDirection]
            case "+": return this.playerOnGoalInViewDirectionSprites[viewDirection]
            case "#": return this.getSpriteForWall(board, position)
            case ".": return this.goalSprite
            case " ": return this.floorSprite

            default: return this.floorSprite
        }
    }

    getFloorSprite(): SpriteData { return this.floorSprite }

    protected getSpriteForWall(board: Board, position: number): SpriteData {

        const spriteImage       = this.getSpriteWallImage(board, position)
        const rectanglesToClear = this.getCutRectangles(board, position)
        const beautyGraphic     = this.getBeautyGraphic(board, position)

        return new SpriteData(spriteImage.image, rectanglesToClear, beautyGraphic)
    }

    /**
     * Returns the correct wall image for the given board position.
     *
     * @param board  the board to draw
     * @param position the position on the board
     */
    protected getSpriteWallImage(board: Board, position: number): SpriteData {
        let graphicIndex = 0

        const positionAbove = board.getNeighborPosition(position, UP)
        const positionRight = board.getNeighborPosition(position, RIGHT)
        const positionBelow = board.getNeighborPosition(position, DOWN)
        const positionLeft  = board.getNeighborPosition(position, LEFT)

        if(positionAbove != NONE && board.isWall(positionAbove)) graphicIndex += 1
        if(positionRight != NONE && board.isWall(positionRight)) graphicIndex += 2
        if(positionBelow != NONE && board.isWall(positionBelow)) graphicIndex += 4
        if(positionLeft  != NONE && board.isWall(positionLeft))  graphicIndex += 8

        return this.wallSprites[graphicIndex]
    }

    protected getBeautyGraphic(board: Board, position: number): SpriteData | null {

        const positionAbove     = board.getNeighborPosition(position, UP)
        const positionLeft      = board.getNeighborPosition(position, LEFT)
        const positionAboveLeft = board.getNeighborPosition(positionAbove, LEFT)

        if(board.isWall(position) &&
            positionAbove     != NONE && board.isWall(positionAbove) &&
            positionLeft      != NONE && board.isWall(positionLeft) &&
            positionAboveLeft != NONE && board.isWall(positionAboveLeft)) {
            const beautyGraphic = this.wallSprites[16]
            beautyGraphic.xDrawOffset = -this.getImageSize()/2
            beautyGraphic.yDrawOffset = -this.getImageSize()/2
            return beautyGraphic
        }

        return null
    }

    /**
     * The beauty graphic split into 4 quadrants:
     * AB
     * CD
     *
     * These 4 sub graphics are rearranged to:
     * DC
     * BA
     * since this way the right quadrants are drawn
     * at the right corners of the wall graphics the
     * beauty graphic is drawn over.
     */
    private async createBeautyGraphic(): Promise<SpriteData> {

        const beautyGraphic = (await this.createWallSpriteForCoordinates(16,0)).image

        const canvas = document.createElement("canvas")
        canvas.width  = this.getImageSize()
        canvas.height = this.getImageSize()
        const ctx = canvas.getContext("2d")!

        // Copy A to lower right corner
        ctx.drawImage(beautyGraphic, 0, 0, this.imageSize/2, this.imageSize/2,
                                     this.imageSize/2, this.imageSize/2, this.imageSize/2, this.imageSize/2)

        // Copy B to lower left corner
        ctx.drawImage(beautyGraphic,this.imageSize/2, 0, this.imageSize/2, this.imageSize/2,
            0, this.imageSize/2, this.imageSize/2
            , this.imageSize/2)

        // Copy C to upper right corner
        ctx.drawImage(beautyGraphic, 0, this.imageSize/2, this.imageSize/2, this.imageSize/2,
                                    this.imageSize/2, 0, this.imageSize/2, this.imageSize/2)

        // Copy D to upper left corner
        ctx.drawImage(beautyGraphic,this.imageSize/2, this.imageSize/2, this.imageSize/2, this.imageSize/2,
            0, 0, this.imageSize/2, this.imageSize/2)

        const image = await this.loadImage(canvas.toDataURL())

        return new SpriteData(image, [], null, -this.getImageSize()/2, -this.getImageSize()/2)
    }

    /**
     * Returns the areas to bet cleared after the sprite has been drawn.
     * Cut areas are needed since the graphics have to be cut when they
     * are adjacent to the background.
     * @param board  the board to draw
     * @param position the position on the board
     */
    protected getCutRectangles(board: Board, position: number): Rectangle[] {
        
        const positionAbove = board.getNeighborPosition(position, UP)
        const positionLeft  = board.getNeighborPosition(position, LEFT)
        const positionRight = board.getNeighborPosition(position, RIGHT)
        const positionBelow = board.getNeighborPosition(position, DOWN)

        const positionAboveLeft  = board.getNeighborPosition(positionAbove, LEFT)
        const positionAboveRight = board.getNeighborPosition(positionAbove, RIGHT)
        const positionBelowLeft  = board.getNeighborPosition(positionBelow, LEFT)
        const positionBelowRight = board.getNeighborPosition(positionBelow, RIGHT)

        const imageWidth  = this.getImageSize()
        const imageHeight = this.getImageSize()
        
        const rectanglesToClear: Rectangle[] = []

        if(board.isBackground(positionAbove)) {
            rectanglesToClear.push(new Rectangle(0, 0, imageWidth, this.topBorder))  // clear the complete top border
        } else {
            if(board.isBackground(positionAboveLeft)) {
                rectanglesToClear.push(new Rectangle(0, 0, this.leftBorder, this.topBorder))  // clear the top left corner
            }
            if(board.isBackground(positionAboveRight)) {
                rectanglesToClear.push(new Rectangle(imageWidth, 0, -this.rightBorder, this.topBorder))  // clear the top right corner
            }
        }

        if(board.isBackground(positionLeft)) {
            rectanglesToClear.push(new Rectangle(0, 0, this.leftBorder, imageHeight))  // clear the left border
        }
        if(board.isBackground(positionRight)) {
            rectanglesToClear.push(new Rectangle(imageWidth, 0, -this.rightBorder, imageHeight))  // clear the right border
        }

        if(board.isBackground(positionBelow)) {
            rectanglesToClear.push(new Rectangle(0, imageHeight, imageWidth, -this.bottomBorder))  // clear the complete bottom border
        } else {
            if(board.isBackground(positionBelowLeft)) {
                rectanglesToClear.push(new Rectangle(0, imageHeight, this.leftBorder, -this.bottomBorder))  // clear the bottom left corner
            }
            if(board.isBackground(positionBelowRight)) {
                rectanglesToClear.push(new Rectangle(imageWidth, imageHeight, -this.rightBorder, -this.bottomBorder))  // clear the bottom right corner
            }
        }

        return rectanglesToClear
    }

    /**
     * The skin graphics usually just contain some few graphics for showing an animation.
     * For a better looking animation this function creates several intermediate graphics
     * by applying alpha blending.
     * @private
     */
    private async createSelectedObjectAnimationBlendingGraphics() {
        this.playerSelectedAnimationSprites       = await this.createSmootherAnimationGraphicsFor(this.playerSelectedAnimationSprites)
        this.playerOnGoalSelectedAnimationSprites = await this.createSmootherAnimationGraphicsFor(this.playerOnGoalSelectedAnimationSprites)
        this.boxSelectedAnimationSprites          = await this.createSmootherAnimationGraphicsFor(this.boxSelectedAnimationSprites)
        this.boxOnGoalSelectedAnimationSprites    = await this.createSmootherAnimationGraphicsFor(this.boxOnGoalSelectedAnimationSprites)
    }

    /**
     * Takes the given sprite images as input and returns a new array of sprites containing
     * additional graphics for showing a smoother animation.
     * @param sprites
     * @private
     */
    private async createSmootherAnimationGraphicsFor(sprites: Array<SpriteData>): Promise<Array<SpriteData>> {

        if(!this.useAlphaBlendingForAnimations) {
            return sprites
        }

        const currentGraphics = [...sprites, sprites[0]]    // for the last image intermediate images for reaching the first image are to be created
        const newGraphics = []

        for(let graphicIndex=0; graphicIndex < currentGraphics.length-1; graphicIndex++) {
            const firstGraphic  = currentGraphics[graphicIndex]
            const secondGraphic = currentGraphics[graphicIndex+1]

            newGraphics.push(firstGraphic)
            const intermediateGraphics = await this.createIntermediateGraphics(firstGraphic.image, secondGraphic.image)
            newGraphics.push(...intermediateGraphics)
        }

        return newGraphics
    }

    /**
     * This method creates and returns intermediate images using alpha blending.
     * These intermediate images are then used to show a smoother animation.
     *
     * @param firstGraphic
     * @param secondGraphic
     */
    private async createIntermediateGraphics(firstGraphic: HTMLImageElement, secondGraphic: HTMLImageElement): Promise<Array<SpriteData>> {

        const canvas  = document.createElement("canvas")
        canvas.width  = this.getImageSize()
        canvas.height = this.getImageSize()
        const ctx = canvas.getContext("2d")!

        const additionalGraphicCount = 4
        const intermediateGraphics = Array<HTMLImageElement>()

        for(let newGraphicCount=0; newGraphicCount < additionalGraphicCount; newGraphicCount++) {

            ctx.drawImage(firstGraphic, 0, 0)

            ctx.globalAlpha = 1.0/(additionalGraphicCount+1) * (newGraphicCount+1)

            ctx.drawImage(secondGraphic, 0, 0)
            ctx.globalAlpha = 1.0

            const additionalImage = await this.loadImage(canvas.toDataURL())

            intermediateGraphics.push(additionalImage)
        }

        return intermediateGraphics.map(image => new SpriteData(image))
    }
}


export class SpriteData {
    constructor(public readonly image:HTMLImageElement,
                public rectanglesToClear: Rectangle[] = [],
                public beautyGraphic: SpriteData | null = null,
                public xDrawOffset: number = 0,
                public yDrawOffset: number = 0) { }
}

export class Rectangle {
    constructor(public readonly x: number,
                public readonly y: number,
                public readonly width: number,
                public readonly height: number) { }
}