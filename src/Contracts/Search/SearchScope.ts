export const SEARCH_SCOPES = Object.freeze({
    Url: 'url',
    Query: 'query',
    RequestHeaders: 'requestHeaders',
    RequestBody: 'requestBody',
    RequestCookies: 'requestCookies',
    ResponseHeaders: 'responseHeaders',
    ResponseBody: 'responseBody',
    ResponseCookies: 'responseCookies',
} as const);

export type SearchScope = (typeof SEARCH_SCOPES)[keyof typeof SEARCH_SCOPES];
