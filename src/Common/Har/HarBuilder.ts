import type { HeaderEntry } from "../../Contracts/Timeline/HeaderEntry";
import type { TimelineEntryDetail } from "../../Contracts/Timeline/TimelineEntryDetail";
import { HeaderLookup } from "../Http/HeaderLookup";
import { SensitiveHeaders } from "../Http/SensitiveHeaders";
import { CookieHeader } from "../Rules/Http/CookieHeader";
import { HeaderList } from "../Rules/Http/HeaderList";
import { SetCookieHeader } from "../Rules/Http/SetCookieHeader";
import { SafeUrl } from "../Urls/SafeUrl";
import type { HarCookie, HarDocument, HarEntry, HarNameValue, HarRequest, HarResponse } from "./HarDocument";

export interface HarOptions {
    creatorVersion: string;
    includeSecrets: boolean;
}

const HarVersion = "1.2";
const CreatorName = "Rewire";
const UnknownSize = -1;
const UnknownHttpVersion = "";
const NoStatus = 0;
const NoDuration = 0;
const ContentTypeHeader = "Content-Type";
const CookieHeaderName = "Cookie";
const SetCookieHeaderName = "Set-Cookie";
const LocationHeader = "Location";

const Utf8 = new TextEncoder();

function byteSize(text: string | null): number {
    return text === null ? 0 : Utf8.encode(text).length;
}

function headersOf(headers: HeaderEntry[], options: HarOptions): HarNameValue[] {
    return headers.map(header => ({
        name: header.name,
        value: options.includeSecrets || !SensitiveHeaders.isSensitive(header.name) ? header.value : "",
    }));
}

function secretOf(value: string, options: HarOptions): string {
    return options.includeSecrets ? value : "";
}

function expiresOf(expires: string): string | undefined {
    const date = new Date(expires);

    return expires === "" || Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function requestCookiesOf(detail: TimelineEntryDetail, options: HarOptions): HarCookie[] {
    return CookieHeader
        .parse(HeaderLookup.find(detail.requestHeaders, CookieHeaderName))
        .map(pair => ({
            name: pair.name,
            value: secretOf(pair.value, options),
        }));
}

function responseCookiesOf(detail: TimelineEntryDetail, options: HarOptions): HarCookie[] {
    return HeaderList
        .values(detail.responseHeaders, SetCookieHeaderName)
        .map(header => SetCookieHeader.parse(header))
        .map(cookie => {
            const harCookie: HarCookie = {
                name: cookie.name,
                value: secretOf(cookie.value, options),
                path: cookie.path,
                domain: cookie.domain,
                httpOnly: cookie.httpOnly,
                secure: cookie.secure,
            };
            const expires = expiresOf(cookie.expires);

            return expires === undefined
                ? harCookie
                : {
                    ...harCookie,
                    expires,
                };
        });
}

function queryOf(url: string): HarNameValue[] {
    const parsed = SafeUrl.parse(url);
    if (parsed === null) {
        return [];
    }

    return [...parsed.searchParams.entries()].map(([name, value]) => ({
        name,
        value,
    }));
}

function requestOf(detail: TimelineEntryDetail, options: HarOptions): HarRequest {
    const request: HarRequest = {
        method: detail.summary.method,
        url: detail.summary.url,
        httpVersion: UnknownHttpVersion,
        cookies: requestCookiesOf(detail, options),
        headers: headersOf(detail.requestHeaders, options),
        queryString: queryOf(detail.summary.url),
        headersSize: UnknownSize,
        bodySize: byteSize(detail.requestBody),
    };
    if (detail.requestBody === null) {
        return request;
    }

    return {
        ...request,
        postData: {
            mimeType: HeaderLookup.find(detail.requestHeaders, ContentTypeHeader) ?? "",
            text: detail.requestBody,
        },
    };
}

function responseOf(detail: TimelineEntryDetail, options: HarOptions): HarResponse {
    const summary = detail.summary;
    const content = {
        size: byteSize(detail.responseBody),
        mimeType: summary.mimeType || (HeaderLookup.find(detail.responseHeaders, ContentTypeHeader) ?? ""),
        ...(detail.responseBody === null
            ? {}
            : {
                text: detail.responseBody,
            }),
        ...(detail.responseBodyNote === null
            ? {}
            : {
                comment: detail.responseBodyNote,
            }),
    };

    return {
        status: summary.statusCode ?? NoStatus,
        statusText: summary.statusText,
        httpVersion: UnknownHttpVersion,
        cookies: responseCookiesOf(detail, options),
        headers: headersOf(detail.responseHeaders, options),
        content,
        redirectURL: HeaderLookup.find(detail.responseHeaders, LocationHeader) ?? "",
        headersSize: UnknownSize,
        bodySize: UnknownSize,
    };
}

function entryOf(detail: TimelineEntryDetail, options: HarOptions): HarEntry {
    const summary = detail.summary;
    const time = summary.durationInMilliseconds ?? NoDuration;
    const entry: HarEntry = {
        startedDateTime: summary.startedAt,
        time,
        request: requestOf(detail, options),
        response: responseOf(detail, options),
        cache: {},
        timings: {
            send: 0,
            wait: time,
            receive: 0,
        },
        _resourceType: summary.resourceType,
    };

    return summary.errorText === null
        ? entry
        : {
            ...entry,
            _error: summary.errorText,
        };
}

function startOf(detail: TimelineEntryDetail): number {
    return Date.parse(detail.summary.startedAt);
}

export const HarBuilder = {
    build(details: TimelineEntryDetail[], options: HarOptions): HarDocument {
        return {
            log: {
                version: HarVersion,
                creator: {
                    name: CreatorName,
                    version: options.creatorVersion,
                },
                pages: [],
                entries: [...details]
                    .sort((left, right) => startOf(left) - startOf(right))
                    .map(detail => entryOf(detail, options)),
            },
        };
    },
};
