export class Messages {

    static showSuccessMessage(title: string, message: string = "") {
        ($('body') as any)
            .toast({
                title: title,
                class: 'green',
                message: message,
                className: {
                    toast: 'ui message'
                }
            })
    }

    static showErrorMessage(title: string, message: string = "") {
        ($('body') as any)
            .toast({
                title: title,
                class: 'error',
                message: message,
                className: {
                    toast: 'ui message'
                }
            })
    }

    static showWarningMessage(title: string, message: string = "") {
        ($('body') as any)
            .toast({
                title: title,
                class: 'yellow',
                message: message,
                className: {
                    toast: 'ui message'
                }
            })
    }
}