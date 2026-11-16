export const CONTENT_FILTER_ID = Object.freeze({
    All: 1,
    Json: 2,
    GraphQl: 3,
    FormData: 4,
    Document: 5,
} as const);

export type ContentFilterId = (typeof CONTENT_FILTER_ID)[keyof typeof CONTENT_FILTER_ID];
