import type { SnippetOptions } from './SnippetOptions';

const CACHE_VALIDATOR_HEADERS = [
    'if-none-match',
    'if-modified-since',
];

export const DEFAULT_SNIPPET_PARTS: SnippetOptions = {
    excludedHeaders: [...CACHE_VALIDATOR_HEADERS],
    excludedCookies: [],
    excludedQueryParams: [],
    shouldIncludeBody: true,
};
