export const SEARCH_FIELDS = Object.freeze({
    Url: 'url',
    Query: 'query',
    RequestBody: 'requestBody',
    ResponseBody: 'responseBody',
    RequestHeaders: 'requestHeaders',
    ResponseHeaders: 'responseHeaders',
    RequestCookies: 'requestCookies',
    ResponseCookies: 'responseCookies',
} as const);

export type SearchField = (typeof SEARCH_FIELDS)[keyof typeof SEARCH_FIELDS];
