export class Base64URL {

    static encode(string: string, encoding: BufferEncoding = 'utf8'): string {
        return Base64URL.escapeURLCharacters(Buffer.from(string, encoding || 'utf8').toString('base64'))
    }

    static decode(string: string, encoding: BufferEncoding = 'utf8'): string {
        return Buffer.from(Base64URL.unescapeURLCharacters(string), 'base64').toString(encoding || 'utf8')
    }

    private static unescapeURLCharacters(string: string) {
        return (string + '==='.slice((string.length + 3) % 4))
            .replace(/-/g, '+')
            .replace(/_/g, '/')
    }

    private static escapeURLCharacters(string: string) {
        return string.replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '')
    }
}