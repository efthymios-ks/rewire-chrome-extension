import { HEADER_NAMES } from '../../Contracts/Http/HeaderNames';
import { type SearchField, SEARCH_FIELDS } from '../../Contracts/Search/SearchField';
import type { SearchMatch } from '../../Contracts/Search/SearchMatch';
import type { SearchQuery } from '../../Contracts/Search/SearchQuery';
import { type SearchScope, SEARCH_SCOPES } from '../../Contracts/Search/SearchScope';
import type { HeaderEntry } from '../../Contracts/Timeline/HeaderEntry';
import { Result } from '../Results/Result';
import { CookieHeader } from '../Rules/Http/CookieHeader';
import type { CookiePair } from '../Rules/Http/CookiePair';
import { HeaderList } from '../Rules/Http/HeaderList';
import { SetCookieHeader } from '../Rules/Http/SetCookieHeader';
import { SearchPattern } from './SearchPattern';

export interface SearchableEntry {
    id: string;
    url: string;
    requestBody: string | null;
    responseBody: string | null;
    requestHeaders: HeaderEntry[];
    responseHeaders: HeaderEntry[];
}

type FieldReader = (entry: SearchableEntry) => string | null;

const QUERY_MARKER = '?';
const FRAGMENT_MARKER = '#';

interface UrlParts {
    location: string;
    query: string | null;
}

function urlPartsOf(url: string): UrlParts {
    const fragmentIndex = url.indexOf(FRAGMENT_MARKER);
    const withoutFragment = fragmentIndex === -1 ? url : url.slice(0, fragmentIndex);
    const queryIndex = withoutFragment.indexOf(QUERY_MARKER);
    if (queryIndex === -1) {
        return {
            location: withoutFragment,
            query: null,
        };
    }

    return {
        location: withoutFragment.slice(0, queryIndex),
        query: withoutFragment.slice(queryIndex + QUERY_MARKER.length),
    };
}

function headerText(headers: HeaderEntry[]): string {
    return headers
        .map(header => `${header.name}: ${header.value}`)
        .join('\n');
}

function cookieText(pairs: CookiePair[]): string {
    return pairs
        .map(pair => `${pair.name}=${pair.value}`)
        .join('\n');
}

const SEARCHABLE_FIELDS: SearchField[] = Object.values(SEARCH_FIELDS);

const FIELD_READERS: Record<SearchField, FieldReader> = {
    [SEARCH_FIELDS.Url]: entry => urlPartsOf(entry.url).location,
    [SEARCH_FIELDS.Query]: entry => urlPartsOf(entry.url).query,
    [SEARCH_FIELDS.RequestBody]: entry => entry.requestBody,
    [SEARCH_FIELDS.ResponseBody]: entry => entry.responseBody,
    [SEARCH_FIELDS.RequestHeaders]: entry => headerText(entry.requestHeaders),
    [SEARCH_FIELDS.ResponseHeaders]: entry => headerText(entry.responseHeaders),
    [SEARCH_FIELDS.RequestCookies]: entry => cookieText(HeaderList
        .values(entry.requestHeaders, HEADER_NAMES.Cookie)
        .flatMap(value => CookieHeader.parse(value))),
    [SEARCH_FIELDS.ResponseCookies]: entry => cookieText(HeaderList
        .values(entry.responseHeaders, HEADER_NAMES.SetCookie)
        .map(value => SetCookieHeader.parse(value))),
};

const FIELD_SCOPES: Record<SearchField, SearchScope> = Object.freeze({
    [SEARCH_FIELDS.Url]: SEARCH_SCOPES.Url,
    [SEARCH_FIELDS.Query]: SEARCH_SCOPES.Query,
    [SEARCH_FIELDS.RequestBody]: SEARCH_SCOPES.RequestBody,
    [SEARCH_FIELDS.ResponseBody]: SEARCH_SCOPES.ResponseBody,
    [SEARCH_FIELDS.RequestHeaders]: SEARCH_SCOPES.RequestHeaders,
    [SEARCH_FIELDS.ResponseHeaders]: SEARCH_SCOPES.ResponseHeaders,
    [SEARCH_FIELDS.RequestCookies]: SEARCH_SCOPES.RequestCookies,
    [SEARCH_FIELDS.ResponseCookies]: SEARCH_SCOPES.ResponseCookies,
});

const HEADERS_HOLDING_COOKIES: ReadonlyMap<SearchScope, SearchScope> = new Map([
    [
        SEARCH_SCOPES.RequestCookies,
        SEARCH_SCOPES.RequestHeaders,
    ],
    [
        SEARCH_SCOPES.ResponseCookies,
        SEARCH_SCOPES.ResponseHeaders,
    ],
]);

// A side's headers already hold its cookies, so searching both would count every cookie hit twice.
function fieldsOf(scopes: SearchScope[]): SearchField[] {
    const searched = scopes.filter(scope => {
        const headers = HEADERS_HOLDING_COOKIES.get(scope);

        return headers == null || !scopes.includes(headers);
    });

    return SEARCHABLE_FIELDS.filter(field => searched.includes(FIELD_SCOPES[field]));
}

export const TimelineSearch = {
    search(entries: SearchableEntry[], query: SearchQuery): Result<SearchMatch[]> {
        const pattern = SearchPattern.create(query);
        if (pattern.hasErrors) {
            return pattern;
        }

        const regex = pattern.value;
        if (regex == null) {
            return Result.ok([]);
        }

        const fields = fieldsOf(query.scopes);
        const matches = entries.flatMap(entry => {
            const counts = fields.map(field => ({
                field,
                count: SearchPattern.countIn(
                    /* pattern: */ regex,
                    /* text: */ FIELD_READERS[field](entry),
                ),
            }));
            const matched = counts.filter(item => item.count > 0);
            if (matched.length === 0) {
                return [];
            }

            return [
                {
                    entryId: entry.id,
                    fields: matched.map(item => item.field),
                    count: matched.reduce((total, item) => total + item.count, 0),
                },
            ];
        });

        return Result.ok(matches);
    },
};
