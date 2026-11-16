export const CONTENT_KIND = Object.freeze({
    Json: 1,
    GraphQl: 2,
    FormData: 3,
    Other: 4,
} as const);

export type ContentKind = (typeof CONTENT_KIND)[keyof typeof CONTENT_KIND];
