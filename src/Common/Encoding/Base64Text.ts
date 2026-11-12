const ByteChunkSize = 0x8000;

export const Base64Text = {
    fromUtf8(text: string): string {
        return Base64Text.fromBytes(new TextEncoder().encode(text));
    },

    fromBytes(bytes: Uint8Array): string {
        let binary = "";
        for (let offset = 0; offset < bytes.length; offset += ByteChunkSize) {
            binary += String.fromCharCode(...bytes.subarray(offset, offset + ByteChunkSize));
        }

        return btoa(binary);
    },

    toUtf8(base64: string): string {
        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));

        return new TextDecoder().decode(bytes);
    },
};
