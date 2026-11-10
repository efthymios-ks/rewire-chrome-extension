import type { HeaderEntry } from "../../Contracts/Timeline/HeaderEntry";

export interface RequestSnapshot {
    method: string;
    url: string;
    headers: HeaderEntry[];
    body: string | null;
}

export interface SnippetOptions {
    excludedHeaders: string[];
    excludedCookies: string[];
    excludedQueryParams: string[];
    includeBody: boolean;
}

const CacheValidatorHeaders = [
    "if-none-match",
    "if-modified-since",
];

export const DefaultSnippetParts: SnippetOptions = {
    excludedHeaders: [...CacheValidatorHeaders],
    excludedCookies: [],
    excludedQueryParams: [],
    includeBody: true,
};
