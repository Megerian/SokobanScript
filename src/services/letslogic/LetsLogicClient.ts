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
            console.log("[LetsLogicClient] Sending request to Letslogic:", url, {
                apiKey: this.apiKey,
                puzzleId,
                solutionLurd
            })
        }

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                    // DO NOT set "User-Agent" here – forbidden in browsers.
                },
                body: bodyParams.toString()
            })

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
