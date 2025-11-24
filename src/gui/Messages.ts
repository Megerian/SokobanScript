export class Messages {

    /**
     * Shows a toast message at the bottom center of the screen.
     *
     * @param typeClass    CSS class / color ('green', 'error', 'yellow', ...)
     * @param title        Main title text of the toast
     * @param message      Optional message text
     * @param displayTime  Visibility duration in milliseconds (0 = stay until manually closed)
     */
    private static showToast(
        typeClass: string,
        title: string,
        message: string = "",
        displayTime: number = 3000
    ): void {
        ($('body') as any).toast({
            title: title,
            message: message,
            class: typeClass,        // 'green', 'error', 'yellow', ...
            position: 'bottom center',
            showIcon: true,
            displayTime: displayTime,
            showProgress: 'top',     // optional: visual progress bar
            closeIcon: true,         // optional: allow manual closing
            className: {
                toast: 'ui message'  // use Semantic/Fomantic "message" look
            }
        })
    }

    /** Short-lived success message. */
    static showSuccessMessage(title: string, message: string = ""): void {
        this.showToast('green', title, message, 3000)
    }

    /** Longer-lived error message. */
    static showErrorMessage(title: string, message: string = ""): void {
        this.showToast('error', title, message, 8000)
    }

    /** Longer-lived warning message. */
    static showWarningMessage(title: string, message: string = ""): void {
        this.showToast('yellow', title, message, 6000)
    }
}
