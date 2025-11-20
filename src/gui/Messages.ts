export class Messages {

    /**
     * Show a toast message at the bottom center of the screen.
     */
    private static showToast(typeClass: string, title: string, message: string = ""): void {
        ($('body') as any).toast({
            title: title,
            message: message,
            class: typeClass,        // 'green', 'error', 'yellow', ...
            position: 'bottom center',
            showIcon: true,
            className: {
                toast: 'ui message'  // use Semantic/Fomantic "message" look
            }
        })
    }

    static showSuccessMessage(title: string, message: string = ""): void {
        this.showToast('green', title, message)
    }

    static showErrorMessage(title: string, message: string = ""): void {
        this.showToast('error', title, message)
    }

    static showWarningMessage(title: string, message: string = ""): void {
        this.showToast('yellow', title, message)
    }
}
