import { describe, expect, test } from 'vitest';
import { type SearchableEntry, TimelineSearch } from './TimelineSearch';
import { type SearchField, SEARCH_FIELDS } from '../../Contracts/Search/SearchField';
import type { SearchMatch } from '../../Contracts/Search/SearchMatch';
import type { SearchQuery } from '../../Contracts/Search/SearchQuery';
import { type SearchScope, SEARCH_SCOPES } from '../../Contracts/Search/SearchScope';
import type { Result } from '../Results/Result';

const ALL_SCOPES: SearchScope[] = Object.values(SEARCH_SCOPES);

function aQuery(overrides: Partial<SearchQuery> = {}): SearchQuery {
    return {
        text: 'ada',
        isRegex: false,
        scopes: [SEARCH_SCOPES.Url],
        ...overrides,
    };
}

function anEntry(overrides: Partial<SearchableEntry> = {}): SearchableEntry {
    return {
        id: 'request-1',
        url: 'https://api.example.com/users/ada',
        requestBody: null,
        responseBody: '{"name":"Ada","friend":"ada"}',
        requestHeaders: [],
        responseHeaders: [
            {
                name: 'X-User',
                value: 'ADA',
            },
        ],
        ...overrides,
    };
}

// "token" appears once in each area: the URL, its query, and a header, body and cookie on each side.
function aTokenEntry(): SearchableEntry {
    return anEntry({
        url: 'https://api.example.com/token?token=0',
        requestBody: '{"token":1}',
        responseBody: '{"token":2}',
        requestHeaders: [
            {
                name: 'Cookie',
                value: 'token=1',
            },
        ],
        responseHeaders: [
            {
                name: 'Set-Cookie',
                value: 'token=2; Path=/',
            },
        ],
    });
}

function fieldsOf(result: Result<SearchMatch[]>): SearchField[] {
    return result.hasErrors ? [] : result.value[0]?.fields ?? [];
}

function countOf(result: Result<SearchMatch[]>): number {
    return result.hasErrors ? 0 : result.value[0]?.count ?? 0;
}

describe('TimelineSearch', () => {
    test('search_WhenEveryScopeIsOn_ShouldCountEveryOccurrence', () => {
        // Arrange
        const entries = [anEntry()];

        // Act
        const result = TimelineSearch.search(
            /* entries: */ entries,
            /* query: */ aQuery({
                scopes: ALL_SCOPES,
            }),
        );

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [
                {
                    entryId: 'request-1',
                    fields: [
                        SEARCH_FIELDS.Url,
                        SEARCH_FIELDS.ResponseBody,
                        SEARCH_FIELDS.ResponseHeaders,
                    ],
                    count: 4,
                },
            ],
        });
    });

    test('search_WhenOnlyTheUrlIsSearched_ShouldIgnoreHeaderAndBodyHits', () => {
        // Arrange
        const entry = anEntry({
            url: 'https://api.example.com/users',
        });

        // Act
        const result = TimelineSearch.search([entry], aQuery());

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [],
        });
    });

    test('search_WhenOnlyTheUrlIsSearched_ShouldLookThroughSchemeHostPortAndPath', () => {
        // Arrange
        const entry = anEntry({
            url: 'https://api.example.com:8443/v1/users?page=2',
        });
        const query = aQuery({
            text: 'https://api.example.com:8443/v1/users',
        });

        // Act
        const result = TimelineSearch.search([entry], query);

        // Assert
        expect(fieldsOf(result)).toEqual([SEARCH_FIELDS.Url]);
    });

    test('search_WhenOnlyTheUrlIsSearched_ShouldSkipTheQueryString', () => {
        // Arrange
        const entry = anEntry({
            url: 'https://api.example.com/users?name=ada',
        });

        // Act
        const result = TimelineSearch.search([entry], aQuery());

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [],
        });
    });

    test('search_WhenOnlyTheQueryIsSearched_ShouldLookThroughTheQueryStringAlone', () => {
        // Arrange
        const entry = anEntry({
            url: 'https://api.example.com/ada?page=2&name=ada',
        });
        const query = aQuery({
            scopes: [SEARCH_SCOPES.Query],
        });

        // Act
        const result = TimelineSearch.search([entry], query);

        // Assert
        expect(fieldsOf(result)).toEqual([SEARCH_FIELDS.Query]);
        expect(countOf(result)).toBe(1);
    });

    test('search_WhenTheUrlHasNoQuery_ShouldFindNothingInTheQuery', () => {
        // Arrange
        const query = aQuery({
            scopes: [SEARCH_SCOPES.Query],
        });

        // Act
        const result = TimelineSearch.search([anEntry()], query);

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [],
        });
    });

    test('search_WhenTheUrlHasAFragment_ShouldLeaveItOutOfTheUrlAndTheQuery', () => {
        // Arrange
        const entry = anEntry({
            url: 'https://api.example.com/users?page=2#ada',
        });
        const query = aQuery({
            scopes: [
                SEARCH_SCOPES.Url,
                SEARCH_SCOPES.Query,
            ],
        });

        // Act
        const result = TimelineSearch.search([entry], query);

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [],
        });
    });

    test.each<[SearchScope, SearchField]>([
        [
            SEARCH_SCOPES.Url,
            SEARCH_FIELDS.Url,
        ],
        [
            SEARCH_SCOPES.Query,
            SEARCH_FIELDS.Query,
        ],
        [
            SEARCH_SCOPES.RequestHeaders,
            SEARCH_FIELDS.RequestHeaders,
        ],
        [
            SEARCH_SCOPES.RequestBody,
            SEARCH_FIELDS.RequestBody,
        ],
        [
            SEARCH_SCOPES.RequestCookies,
            SEARCH_FIELDS.RequestCookies,
        ],
        [
            SEARCH_SCOPES.ResponseHeaders,
            SEARCH_FIELDS.ResponseHeaders,
        ],
        [
            SEARCH_SCOPES.ResponseBody,
            SEARCH_FIELDS.ResponseBody,
        ],
        [
            SEARCH_SCOPES.ResponseCookies,
            SEARCH_FIELDS.ResponseCookies,
        ],
    ])('search_WhenOnlyTheScopeIs(%s)_ShouldSearchThatAreaAlone', (scope, expected) => {
        // Arrange
        const query = aQuery({
            text: 'token',
            scopes: [scope],
        });

        // Act
        const result = TimelineSearch.search([aTokenEntry()], query);

        // Assert
        expect(fieldsOf(result)).toEqual([expected]);
        expect(countOf(result)).toBe(1);
    });

    test('search_WhenScopesAreCombined_ShouldSearchEachOfThem', () => {
        // Arrange
        const query = aQuery({
            text: 'token',
            scopes: [
                SEARCH_SCOPES.Url,
                SEARCH_SCOPES.RequestBody,
                SEARCH_SCOPES.ResponseBody,
            ],
        });

        // Act
        const result = TimelineSearch.search([aTokenEntry()], query);

        // Assert
        expect(fieldsOf(result)).toEqual([
            SEARCH_FIELDS.Url,
            SEARCH_FIELDS.RequestBody,
            SEARCH_FIELDS.ResponseBody,
        ]);
        expect(countOf(result)).toBe(3);
    });

    test('search_WhenASidesHeadersAndCookiesAreOn_ShouldCountEachCookieHitOnce', () => {
        // Arrange
        const query = aQuery({
            text: 'token',
            scopes: [
                SEARCH_SCOPES.RequestHeaders,
                SEARCH_SCOPES.RequestCookies,
                SEARCH_SCOPES.ResponseHeaders,
                SEARCH_SCOPES.ResponseCookies,
            ],
        });

        // Act
        const result = TimelineSearch.search([aTokenEntry()], query);

        // Assert
        expect(fieldsOf(result)).toEqual([
            SEARCH_FIELDS.RequestHeaders,
            SEARCH_FIELDS.ResponseHeaders,
        ]);
        expect(countOf(result)).toBe(2);
    });

    test('search_WhenOneSidesHeadersAndTheOtherSidesCookiesAreOn_ShouldSearchBoth', () => {
        // Arrange
        const query = aQuery({
            text: 'token',
            scopes: [
                SEARCH_SCOPES.RequestHeaders,
                SEARCH_SCOPES.ResponseCookies,
            ],
        });

        // Act
        const result = TimelineSearch.search([aTokenEntry()], query);

        // Assert
        expect(fieldsOf(result)).toEqual([
            SEARCH_FIELDS.RequestHeaders,
            SEARCH_FIELDS.ResponseCookies,
        ]);
        expect(countOf(result)).toBe(2);
    });

    test('search_WhenOnlyResponseCookiesAreSearched_ShouldSkipTheSetCookieAttributes', () => {
        // Arrange
        const query = aQuery({
            text: 'Path',
            scopes: [SEARCH_SCOPES.ResponseCookies],
        });

        // Act
        const result = TimelineSearch.search([aTokenEntry()], query);

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [],
        });
    });

    test('search_WhenOnlyRequestCookiesAreSearched_ShouldMatchACookieNameWithItsValue', () => {
        // Arrange
        const query = aQuery({
            text: 'token=1',
            scopes: [SEARCH_SCOPES.RequestCookies],
        });

        // Act
        const result = TimelineSearch.search([aTokenEntry()], query);

        // Assert
        expect(fieldsOf(result)).toEqual([SEARCH_FIELDS.RequestCookies]);
    });

    test('search_WhenOnlyTheRequestBodyIsSearched_ShouldIgnoreTheResponseBody', () => {
        // Arrange
        const query = aQuery({
            scopes: [SEARCH_SCOPES.RequestBody],
        });

        // Act
        const result = TimelineSearch.search([anEntry()], query);

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [],
        });
    });

    test('search_WhenTheQueryIsUpperCase_ShouldStillMatchEveryCase', () => {
        // Arrange
        const query = aQuery({
            text: 'ADA',
            scopes: ALL_SCOPES,
        });

        // Act
        const result = TimelineSearch.search([anEntry()], query);

        // Assert
        expect(countOf(result)).toBe(4);
    });

    test('search_WhenNoFieldHoldsTheText_ShouldReturnNothing', () => {
        // Arrange
        const query = aQuery({
            text: 'nowhere-to-be-found',
            scopes: ALL_SCOPES,
        });

        // Act
        const result = TimelineSearch.search([anEntry()], query);

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [],
        });
    });

    test('search_WhenTheRegexIsInvalid_ShouldFail', () => {
        // Arrange
        const query = aQuery({
            text: '(',
            isRegex: true,
        });

        // Act
        const result = TimelineSearch.search([anEntry()], query);

        // Assert
        expect(result.hasErrors).toBe(true);
    });

    test('search_WhenTheTextIsEmpty_ShouldReturnNothing', () => {
        // Arrange
        const query = aQuery({
            text: '',
        });

        // Act
        const result = TimelineSearch.search([anEntry()], query);

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [],
        });
    });
});
