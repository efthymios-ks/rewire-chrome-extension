import { HEADER_NAMES } from '../../Contracts/Http/HeaderNames';
import { HTTP_METHODS } from '../../Contracts/Http/HttpMethods';
import { CookieHeader } from '../Rules/Http/CookieHeader';
import { QueryString } from '../Urls/QueryString';
import type { RequestSnapshot } from './RequestSnapshot';
import { SnippetBodies } from './SnippetBodies';
import { SnippetHeaders } from './SnippetHeaders';
import type { SnippetOptions } from './SnippetOptions';
import type { SnippetRequest } from './SnippetRequest';

const BODYLESS_METHODS: string[] = [
    HTTP_METHODS.Get,
    HTTP_METHODS.Head,
];

export const SnippetRequests = {
    of(snapshot: RequestSnapshot, options: SnippetOptions): SnippetRequest {
        const sendable = SnippetHeaders.forSnippet(snapshot.headers);
        const cookies = sendable
            .filter(header => SnippetHeaders.isNamed(header, HEADER_NAMES.Cookie))
            .flatMap(header => CookieHeader.parse(header.value))
            .filter(cookie => !options.excludedCookies.includes(cookie.name));
        const headers = sendable
            .filter(header => !SnippetHeaders.isNamed(header, HEADER_NAMES.Cookie))
            .filter(header => !options.excludedHeaders.includes(header.name.toLowerCase()));

        return {
            method: snapshot.method.toUpperCase(),
            url: QueryString.without(snapshot.url, options.excludedQueryParams),
            headers,
            cookies,
            body: options.shouldIncludeBody && snapshot.body != null
                ? SnippetBodies.text(snapshot.body)
                : SnippetBodies.none(),
        };
    },

    cookieTextOf(request: SnippetRequest): string | null {
        return request.cookies.length === 0 ? null : CookieHeader.serialize(request.cookies);
    },

    isBodyless(method: string): boolean {
        return BODYLESS_METHODS.includes(method);
    },
};
