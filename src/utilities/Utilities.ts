import {GUI} from "../gui/GUI"

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
    static copyToClipboard(text: string) {
        navigator.clipboard.writeText(text)
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
     *  Returns the content of the clipboard or `null` in case the user rejected pasting the content.
     *  New line character in the returned string is always just \n (not \r\n).
     */
    static async getStringFromClipboard(): Promise<string | null> {

        let clipboardString : string | null = ""    // null in case the user cancels pasting to text area

        try {
            await navigator.clipboard.readText().then(
                (clipboardContent: string) => clipboardString = clipboardContent
            )
        } catch (e: unknown) {  // Fallback for Firefox Browser
            await this.getClipboardFallBackSolution().then(
                (clipboardContent: string | null) => clipboardString = clipboardContent
            )
        }

        return clipboardString.replace(/\r/g, "")
    }

    /**
     * Fallback solution for Firefox browser to get content from clipboard.
     */
    private static getClipboardFallBackSolution(): Promise<string | null> {
        return new Promise<string>((resolve, reject) => {

            const textArea = document.getElementById("pastedClipboardContent") as HTMLTextAreaElement
            textArea.value = "";   // clear previous content

            ($('#pasteFromClipboardDialog') as any).modal({    // show text area to paste the content
                onShow: () => {
                    GUI.isModalDialogShown = true
                },    // tell the GUI listeners that we
                onHidden: () => {
                    GUI.isModalDialogShown = false
                }, // handle input events

                onApprove: function () {
                    resolve(textArea.value)
                },

                onDeny: function () {
                    reject("pasteDenied")
                }
            }).modal('show')
        }).catch(() => null)
    }
}