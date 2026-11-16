const Utf8 = new TextEncoder();
const BASE64_PADDING = /=+$/;
const BASE64_GROUP_BYTES = 3;
const BASE64_GROUP_CHARACTERS = 4;
const NUMBER_LOCALE = 'en-US';
const ONE = 1;

export const ByteSize = {
    ofText(text: string): number {
        return Utf8.encode(text).length;
    },

    ofBase64(base64: string): number {
        const length = base64.replace(BASE64_PADDING, '').length;

        return Math.floor(length * BASE64_GROUP_BYTES / BASE64_GROUP_CHARACTERS);
    },

    textOf(count: number): string {
        return `${count.toLocaleString(NUMBER_LOCALE)} ${count === ONE ? 'byte' : 'bytes'}`;
    },
};
