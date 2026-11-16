import { HEADER_NAMES } from '../../Contracts/Http/HeaderNames';
import type { HeaderEntry } from '../../Contracts/Timeline/HeaderEntry';
import { DEFAULT_SNIPPET_PARTS } from './DefaultSnippetParts';
import { FetchCall } from './FetchCall';
import type { RequestSnapshot } from './RequestSnapshot';
import { RequestSnippetBase } from './RequestSnippetBase';
import { SnippetHeaders } from './SnippetHeaders';
import type { SnippetOptions } from './SnippetOptions';
import type { SnippetRequest } from './SnippetRequest';
import { SnippetRequests } from './SnippetRequests';

const FORBIDDEN_HEADERS = [
    'accept-charset',
    'accept-encoding',
    'access-control-request-headers',
    'access-control-request-method',
    'cookie2',
    'date',
    'dnt',
    'origin',
    'referer',
    'set-cookie',
    'trailer',
    'user-agent',
    'via',
];
const FORBIDDEN_PREFIXES = [
    'proxy-',
    'sec-',
];
const CREDENTIALS = Object.freeze({
    Include: 'include',
    Omit: 'omit',
} as const);
const PICKED_FILE_EXPRESSION = 'document.querySelector("input[type=file]").files[0]';

function isAllowed(header: HeaderEntry): boolean {
    const name = header.name.toLowerCase();

    return !FORBIDDEN_HEADERS.includes(name) && !FORBIDDEN_PREFIXES.some(prefix => name.startsWith(prefix));
}

function browserOptions(request: SnippetRequest): Array<[string, string]> {
    const extra: Array<[string, string]> = [];
    const referer = SnippetHeaders.find(request.headers, HEADER_NAMES.Referer);
    if (referer != null) {
        extra.push([
            'referrer',
            JSON.stringify(referer.value),
        ]);
    }

    const credentials = SnippetRequests.cookieTextOf(request) == null
        ? CREDENTIALS.Omit
        : CREDENTIALS.Include;
    extra.push([
        'credentials',
        JSON.stringify(credentials),
    ]);

    return extra;
}

export class FetchSnippet extends RequestSnippetBase {
    static readonly id = 'fetch';
    static readonly label = 'Fetch (browser)';

    static tryParse(_text: string): FetchSnippet | null {
        return null;
    }

    static from(snapshot: RequestSnapshot, options: SnippetOptions = DEFAULT_SNIPPET_PARTS): FetchSnippet {
        return new FetchSnippet(SnippetRequests.of(snapshot, options));
    }

    override toString(): string {
        return FetchCall.render(this.request, {
            headersOf: request => request.headers.filter(isAllowed),
            extraOptions: browserOptions,
            fileExpression: () => PICKED_FILE_EXPRESSION,
            preamble: () => [],
        });
    }
}
