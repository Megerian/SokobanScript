export class Base64URL {

    static encode(string: string): string {
        const bytes = new TextEncoder().encode(string)
        return bytes.toBase64({ alphabet: 'base64url', omitPadding: true })
    }

    static decode(string: string, encoding: string = 'utf-8'): string {
        const bytes = Uint8Array.fromBase64(string, { alphabet: 'base64url' })
        return new TextDecoder(encoding || 'utf-8').decode(bytes)
    }
}