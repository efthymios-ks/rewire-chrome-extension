export const SearchFields = {
    Url: "url",
    RequestBody: "requestBody",
    ResponseBody: "responseBody",
    RequestHeaders: "requestHeaders",
    ResponseHeaders: "responseHeaders",
} as const;

export type SearchField = typeof SearchFields[keyof typeof SearchFields];

export interface SearchQuery {
    text: string;
    isCaseSensitive: boolean;
    isRegex: boolean;
}

export interface SearchMatch {
    entryId: string;
    fields: SearchField[];
    count: number;
}
