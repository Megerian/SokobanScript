import { GUI } from "../gui/GUI"
import $ from 'jquery'

export class Utilities {

    /**
     * Coerces the given `value` to be between the given
     * `min` and `max` value and returns that value.
     *
     * @param value  the value to be coerced
     * @param min  the minimum value
     * @param max  the maximum value
     */
    static coerceIn(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max)
    }

    /** Copies the given text string to the clipboard. */
    static copyToClipboard(text: string): Promise<void> {
        return navigator.clipboard.writeText(text)
    }

    /**
     * Returns the value of the given URL parameter.
     *
     * @param parameterName the parameter to return the value for
     */
    static getURLParameter(parameterName: string): string | null {
        const queryString = location.search
        const urlParams = new URLSearchParams(queryString)
        return urlParams.get(parameterName)
    }

    /**
     * Returns the content of the clipboard or `null` in case the user rejected pasting the content.
     * New line character in the returned string is always just \n (not \r\n).
     */
    static async getStringFromClipboard(): Promise<string | null> {
        try {
            // Clean asynchronous fetch without mixed .then() chains
            const clipboardContent = await navigator.clipboard.readText()
            return clipboardContent.replace(/\r/g, "")
        } catch (e: unknown) {
            // Fallback for browsers with strict clipboard policies (e.g., Firefox)
            const fallbackContent = await this.getClipboardFallBackSolution()
            return fallbackContent !== null ? fallbackContent.replace(/\r/g, "") : null
        }
    }

    /**
     * Fallback solution for Firefox browser to get content from clipboard.
     */
    private static getClipboardFallBackSolution(): Promise<string | null> {
        return new Promise<string | null>((resolve) => {
            const textArea = document.getElementById("pastedClipboardContent") as HTMLTextAreaElement

            if (!textArea) {
                console.error("Required fallback element 'pastedClipboardContent' not found in DOM.")
                resolve(null)
                return
            }

            textArea.value = "";

            ($('#pasteFromClipboardDialog') as any).modal({
                'onShow': () => {
                    GUI.isModalDialogShown = true
                },
                'onHidden': () => {
                    GUI.isModalDialogShown = false
                },
                'onApprove': () => {
                    resolve(textArea.value)
                },
                'onDeny': () => {
                    resolve(null)
                }
            }).modal('show')
        })
    }
}