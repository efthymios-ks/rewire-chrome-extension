const Utf8 = new TextEncoder();
const Base64Padding = /=+$/;
const Base64GroupBytes = 3;
const Base64GroupCharacters = 4;

export const ByteSize = {
    ofText(text: string): number {
        return Utf8.encode(text).length;
    },

    ofBase64(base64: string): number {
        const length = base64.replace(Base64Padding, "").length;

        return Math.floor(length * Base64GroupBytes / Base64GroupCharacters);
    },
};
