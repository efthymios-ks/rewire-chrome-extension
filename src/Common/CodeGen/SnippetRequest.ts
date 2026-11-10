import type { HeaderEntry } from "../../Contracts/Timeline/HeaderEntry";
import { type CookiePair, CookieHeader } from "../Rules/Http/CookieHeader";
import { QueryString } from "../Urls/QueryString";
import type { RequestSnapshot, SnippetOptions } from "./RequestSnapshot";
import { type SnippetBody, SnippetBodies } from "./SnippetBody";
import { SnippetHeaderNames, SnippetHeaders } from "./SnippetHeaders";

const BodylessMethods = [
    "GET",
    "HEAD",
];

export interface SnippetRequest {
    method: string;
    url: string;
    headers: HeaderEntry[];
    cookies: CookiePair[];
    body: SnippetBody;
}

export const SnippetRequests = {
    of(snapshot: RequestSnapshot, options: SnippetOptions): SnippetRequest {
        const sendable = SnippetHeaders.sendable(snapshot.headers);
        const cookies = sendable
            .filter(header => SnippetHeaders.isNamed(header, SnippetHeaderNames.Cookie))
            .flatMap(header => CookieHeader.parse(header.value))
            .filter(cookie => !options.excludedCookies.includes(cookie.name));
        const headers = sendable
            .filter(header => !SnippetHeaders.isNamed(header, SnippetHeaderNames.Cookie))
            .filter(header => !options.excludedHeaders.includes(header.name.toLowerCase()));

        return {
            method: snapshot.method.toUpperCase(),
            url: QueryString.without(snapshot.url, options.excludedQueryParams),
            headers,
            cookies,
            body: options.includeBody && snapshot.body !== null ? SnippetBodies.text(snapshot.body) : SnippetBodies.none(),
        };
    },

    cookieTextOf(request: SnippetRequest): string | null {
        return request.cookies.length === 0 ? null : CookieHeader.serialize(request.cookies);
    },

    isBodyless(method: string): boolean {
        return BodylessMethods.includes(method);
    },
};
