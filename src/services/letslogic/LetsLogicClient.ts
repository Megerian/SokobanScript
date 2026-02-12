export interface LetsLogicSendSolutionAnswer {
    result?: string
    error?: string
    blue?: {
        rank?: number
        points?: number
        moves?: number
        pushes?: number
    }
    green?: {
        rank?: number
        points?: number
        moves?: number
        pushes?: number
    }
}

// Public API types for reading collections and levels
export interface LetsLogicLevelCollection {
    id: number
    title: string
    author: string
    description: string
    // Number of levels in the collection (API field name is "levels")
    levels: number
}

export interface LetsLogicLevel {
    id: number
    height: number
    width: number
    title: string
    author: string
    map: string
    blue_moves: number
    blue_pushes: number
    green_moves: number
    green_pushes: number
}

/**
 * Minimal client for the Letslogic API.
 *
 * Now we call the Letslogic HTTPS API directly from the browser.
 * The Letslogic server sends the required CORS headers, so no
 * PHP proxy is needed anymore.
 */
export class LetsLogicClient {

    /**
     * Base URL of the Letslogic API.
     *
     * Example final URL for a level with ID 123:
     *   https://letslogic.com/api/v1/level/123
     */
    static readonly API_BASE_URL = "https://letslogic.com/api/v1/level"

    // Additional endpoints used for reading data
    private static readonly COLLECTIONS_URL = "https://letslogic.com/api/v1/collections"
    private static readonly COLLECTION_URL_PREFIX = "https://letslogic.com/api/v1/collection/"

    /**
     * Debug flag.
     *
     * You can enable it:
     *   - in code:   LetsLogicClient.DEBUG = true
     *   - in browser console:  window.LETSLOGIC_DEBUG = true
     */
    static DEBUG: boolean = false

    constructor(
        private readonly apiKey: string,
    ) {}

    /**
     * Helper: returns whether debug logging is currently enabled.
     * Checks both the static flag and an optional global flag on window.
     */
    private static isDebugEnabled(): boolean {
        if (LetsLogicClient.DEBUG) {
            return true
        }
        if (typeof window !== "undefined" && (window as any).LETSLOGIC_DEBUG === true) {
            return true
        }
        return false
    }

    /**
     * Fetches all Letslogic collections available to the API key.
     * POST form field: key
     */
    async getCollections(): Promise<LetsLogicLevelCollection[]> {
        const bodyParams = new URLSearchParams()
        bodyParams.set("key", this.apiKey)

        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 15000)
            const response = await fetch(LetsLogicClient.COLLECTIONS_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                },
                body: bodyParams.toString(),
                signal: controller.signal
            })
            clearTimeout(timeout)

            if (!response.ok) {
                const errText = await response.text().catch(() => "")
                console.error(`[LetsLogicClient] getCollections: HTTP ${response.status}:`, errText)
                return []
            }

            const text = await response.text()
            if (LetsLogicClient.isDebugEnabled()) {
                console.log("[LetsLogicClient] Raw getCollections response:", text)
            }

            try {
                const json = JSON.parse(text) as LetsLogicLevelCollection[]
                if (Array.isArray(json)) {
                    return json
                }
            } catch (e) {
                console.error("[LetsLogicClient] getCollections: invalid JSON:", text)
            }
        } catch (e) {
            console.error("[LetsLogicClient] getCollections: request failed:", e)
        }

        return []
    }

    /** Options for getLevels */
    public static readonly defaultMapOptions = { convertMap: true, addNewlines: true }

    /**
     * Loads all levels of a Letslogic collection.
     * POST form field: key
     *
     * By default the map string is converted from digits to Sokoban characters
     * and line breaks are inserted when width*height matches the map length.
     */
    async getLevels(
        collectionId: number,
        options?: { convertMap?: boolean; addNewlines?: boolean }
    ): Promise<LetsLogicLevel[]> {
        if (!Number.isFinite(collectionId) || collectionId <= 0) {
            if (LetsLogicClient.isDebugEnabled()) {
                console.warn("[LetsLogicClient] getLevels called with invalid collectionId:", collectionId)
            }
            return []
        }

        const { convertMap, addNewlines } = { ...LetsLogicClient.defaultMapOptions, ...options }

        const bodyParams = new URLSearchParams()
        bodyParams.set("key", this.apiKey)

        const url = `${LetsLogicClient.COLLECTION_URL_PREFIX}${collectionId}`

        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 20000)
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                },
                body: bodyParams.toString(),
                signal: controller.signal
            })
            clearTimeout(timeout)

            if (!response.ok) {
                const errText = await response.text().catch(() => "")
                console.error(`[LetsLogicClient] getLevels: HTTP ${response.status}:`, errText)
                return []
            }

            const text = await response.text()
            if (LetsLogicClient.isDebugEnabled()) {
                console.log("[LetsLogicClient] Raw getLevels response:", text)
            }

            try {
                const json = JSON.parse(text) as LetsLogicLevel[]
                if (Array.isArray(json)) {
                    if (convertMap) {
                        for (const lvl of json) {
                            if (typeof lvl.map === "string") {
                                lvl.map = LetsLogicClient.convertMapString(lvl.map, lvl.width, lvl.height, !!addNewlines)
                            }
                            // normalize negative width/height if any
                            if (typeof lvl.width === "number" && lvl.width < 0) lvl.width = 0
                            if (typeof lvl.height === "number" && lvl.height < 0) lvl.height = 0
                        }
                    }
                    return json
                }
            } catch (e) {
                console.error("[LetsLogicClient] getLevels: invalid JSON:", text)
            }
        } catch (e) {
            console.error("[LetsLogicClient] getLevels: request failed:", e)
        }

        return []
    }

    /** Converts Letslogic numeric map to Sokoban characters and optionally adds newlines */
    private static convertMapString(map: string, width: number, height: number, addNewlines: boolean): string {
        // 0 -> space, 1 -> wall '#', 2 -> player '@', 3 -> box '$', 4 -> goal '.', 5 -> box on goal '*', 6 -> player on goal '+', 7 -> void '-'
        let converted = map
            .replace(/0/g, " ")
            .replace(/1/g, "#")
            .replace(/2/g, "@")
            .replace(/3/g, "$")
            .replace(/4/g, ".")
            .replace(/5/g, "*")
            .replace(/6/g, "+")
            .replace(/7/g, "-")

        if (addNewlines && width > 0 && height > 0 && converted.length === width * height) {
            const rows: string[] = []
            for (let i = 0; i < converted.length; i += width) {
                rows.push(converted.substring(i, i + width))
            }
            converted = rows.join("\n") + "\n"
        }
        return converted
    }

    /**
     * Public method used by LetslogicService.
     *
     * It calls the Letslogic API directly.
     * If Letslogic returns "API Locked", we retry a few times.
     */
    async submitSolution(puzzleId: number, solutionLurd: string): Promise<LetsLogicSendSolutionAnswer | null> {

        if (puzzleId <= 0) {
            if (LetsLogicClient.isDebugEnabled()) {
                console.warn("[LetsLogicClient] submitSolution called with invalid puzzleId:", puzzleId)
            }
            return null
        }

        const maxAttempts = 5
        let attempt = 0

        while (attempt < maxAttempts) {
            attempt++

            const answer = await this.trySubmitSolution(puzzleId, solutionLurd)
            if (!answer) {
                // Network / fetch error
                return null
            }

            if (LetsLogicClient.isDebugEnabled()) {
                console.log(
                    `[LetsLogicClient] Attempt ${attempt}/${maxAttempts} – response from Letslogic:`,
                    answer
                )
            }

            // Letslogic sometimes returns "API Locked" to tell you to slow down.
            if (answer.error && answer.error.includes("API Locked") && attempt < maxAttempts) {
                if (LetsLogicClient.isDebugEnabled()) {
                    console.warn("[LetsLogicClient] API Locked – retrying after 500 ms...")
                }
                await new Promise(resolve => setTimeout(resolve, 500))
                continue
            }

            return answer
        }

        return null
    }

    /**
     * Single request to Letslogic. No retry logic here.
     */
    private async trySubmitSolution(
        puzzleId: number,
        solutionLurd: string
    ): Promise<LetsLogicSendSolutionAnswer | null> {

        const url = `${LetsLogicClient.API_BASE_URL}/${puzzleId}`

        // We send our data directly to Letslogic as form-urlencoded:
        //   key       – Letslogic API key
        //   solution  – LURD solution string
        const bodyParams = new URLSearchParams()
        bodyParams.set("key", this.apiKey)
        bodyParams.set("solution", solutionLurd)

        if (LetsLogicClient.isDebugEnabled()) {
            const maskedKey = this.apiKey.length > 8
                ? this.apiKey.slice(0, 4) + "…" + this.apiKey.slice(-2)
                : "***"
            console.log("[LetsLogicClient] Sending request to Letslogic:", url, {
                apiKey: maskedKey,
                puzzleId,
                solutionLurdLength: solutionLurd.length
            })
        }

        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 20000)
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                    // DO NOT set "User-Agent" here – forbidden in browsers.
                },
                body: bodyParams.toString(),
                signal: controller.signal
            })
            clearTimeout(timeout)

            if (!response.ok) {
                const errText = await response.text().catch(() => "")
                if (LetsLogicClient.isDebugEnabled()) {
                    console.warn(`[LetsLogicClient] submitSolution: HTTP ${response.status}:`, errText)
                }
                return { error: errText || `HTTP ${response.status}` }
            }

            const text = await response.text()

            if (LetsLogicClient.isDebugEnabled()) {
                console.log("[LetsLogicClient] Raw Letslogic response text:", text)
            }

            // Letslogic normally returns JSON (success or error)
            try {
                const json = JSON.parse(text)
                const answer: LetsLogicSendSolutionAnswer = {
                    result: json.result,
                    error: json.error,
                    blue:  json.blue,
                    green: json.green
                }
                return answer
            } catch {
                // Response not valid JSON – still return as error
                console.error("[LetsLogicClient] Letslogic response is not valid JSON:", text)
                return { error: text }
            }

        } catch (e) {
            console.error("Error while submitting solution directly to Letslogic:", e)
            return null
        }
    }
}
