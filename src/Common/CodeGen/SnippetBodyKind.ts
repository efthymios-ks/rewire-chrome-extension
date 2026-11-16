export const SNIPPET_BODY_KIND = Object.freeze({
    None: 1,
    Text: 2,
    Multipart: 3,
    File: 4,
} as const);

export type SnippetBodyKind = (typeof SNIPPET_BODY_KIND)[keyof typeof SNIPPET_BODY_KIND];
