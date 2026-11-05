const TextualMimeMarkers = [
    "json",
    "text/",
    "xml",
    "javascript",
    "graphql",
    "x-www-form-urlencoded",
];

export const TextualMime = {
    isTextual(mimeType: string): boolean {
        const lowerMimeType = mimeType.toLowerCase();

        return TextualMimeMarkers.some(marker => lowerMimeType.includes(marker));
    },
};
