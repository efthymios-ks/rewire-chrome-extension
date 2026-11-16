const TEXTUAL_MIME_MARKERS = [
    'json',
    'text/',
    'xml',
    'javascript',
    'graphql',
    'x-www-form-urlencoded',
];

export const TextualMime = {
    isTextual(mimeType: string): boolean {
        const lowerMimeType = mimeType.toLowerCase();

        return TEXTUAL_MIME_MARKERS.some(marker => lowerMimeType.includes(marker));
    },
};
