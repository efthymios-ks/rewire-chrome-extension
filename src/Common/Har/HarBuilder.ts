import { HEADER_NAMES } from '../../Contracts/Http/HeaderNames';
import type { HeaderEntry } from '../../Contracts/Timeline/HeaderEntry';
import type { TimelineEntryDetail } from '../../Contracts/Timeline/TimelineEntryDetail';
import { ByteSize } from '../Encoding/ByteSize';
import { HeaderLookup } from '../Http/HeaderLookup';
import { SensitiveHeaders } from '../Http/SensitiveHeaders';
import { CookieHeader } from '../Rules/Http/CookieHeader';
import { HeaderList } from '../Rules/Http/HeaderList';
import { SetCookieHeader } from '../Rules/Http/SetCookieHeader';
import { SafeUrl } from '../Urls/SafeUrl';
import type { HarCookie } from './HarCookie';
import type { HarDocument } from './HarDocument';
import type { HarEntry } from './HarEntry';
import type { HarNameValue } from './HarNameValue';
import type { HarRequest } from './HarRequest';
import type { HarResponse } from './HarResponse';

export interface HarOptions {
    creatorVersion: string;
    shouldIncludeSecrets: boolean;
}

const HAR_VERSION = '1.2';
const CREATOR_NAME = 'Rewire';
const UNKNOWN_SIZE = -1;
const UNKNOWN_HTTP_VERSION = '';
const NO_STATUS = 0;
const NO_DURATION = 0;
const NO_BODY_SIZE = 0;

type HarRequestBody = Pick<HarRequest, 'bodySize' | 'postData'>;

function byteSize(text: string | null): number {
    return text == null ? 0 : ByteSize.ofText(text);
}

function headersOf(headers: HeaderEntry[], options: HarOptions): HarNameValue[] {
    return headers.map(header => ({
        name: header.name,
        value: options.shouldIncludeSecrets || !SensitiveHeaders.isSensitive(header.name) ? header.value : '',
    }));
}

function secretOf(value: string, options: HarOptions): string {
    return options.shouldIncludeSecrets ? value : '';
}

function expiresOf(expires: string): string | undefined {
    const date = new Date(expires);

    return expires === '' || Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function requestCookiesOf(detail: TimelineEntryDetail, options: HarOptions): HarCookie[] {
    return CookieHeader
        .parse(HeaderLookup.find(detail.requestHeaders, HEADER_NAMES.Cookie))
        .map(pair => ({
            name: pair.name,
            value: secretOf(pair.value, options),
        }));
}

function responseCookiesOf(detail: TimelineEntryDetail, options: HarOptions): HarCookie[] {
    return HeaderList
        .values(detail.responseHeaders, HEADER_NAMES.SetCookie)
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

            return expires == null
                ? harCookie
                : {
                    ...harCookie,
                    expires,
                };
        });
}

function queryOf(url: string): HarNameValue[] {
    const parsed = SafeUrl.parse(url);
    if (parsed == null) {
        return [];
    }

    return [...parsed.searchParams.entries()].map(([name, value]) => ({
        name,
        value,
    }));
}

function requestMimeTypeOf(detail: TimelineEntryDetail): string {
    return HeaderLookup.find(detail.requestHeaders, HEADER_NAMES.ContentType) ?? '';
}

function decodedCommentOf(note: string, sentSize: number | null): string {
    const comment = `Decoded by Rewire: ${note}`;

    return sentSize == null ? comment : `${comment} The request sent ${ByteSize.textOf(sentSize)}.`;
}

function binaryCommentOf(sentSize: number | null): string {
    return sentSize == null
        ? 'Binary body, not exported.'
        : `Binary body (${ByteSize.textOf(sentSize)}), not exported.`;
}

function textBodyOf(detail: TimelineEntryDetail, text: string): HarRequestBody {
    const mimeType = requestMimeTypeOf(detail);
    const sentSize = detail.requestBodyByteSize;
    const note = detail.requestBodyNote;
    if (note == null) {
        return {
            bodySize: sentSize ?? byteSize(text),
            postData: {
                mimeType,
                text,
            },
        };
    }

    return {
        bodySize: sentSize ?? UNKNOWN_SIZE,
        postData: {
            mimeType,
            text,
            comment: decodedCommentOf(note, sentSize),
        },
    };
}

// The headers stay as sent, so the body size counts the sent bytes, not the decoded text.
function requestBodyOf(detail: TimelineEntryDetail): HarRequestBody {
    const sentSize = detail.requestBodyByteSize;
    if (detail.requestBody != null) {
        return textBodyOf(detail, detail.requestBody);
    }

    if (detail.requestBodyBase64 != null) {
        return {
            bodySize: sentSize ?? UNKNOWN_SIZE,
            postData: {
                mimeType: requestMimeTypeOf(detail),
                comment: binaryCommentOf(sentSize),
            },
        };
    }

    return {
        bodySize: sentSize ?? NO_BODY_SIZE,
    };
}

function requestOf(detail: TimelineEntryDetail, options: HarOptions): HarRequest {
    return {
        method: detail.summary.method,
        url: detail.summary.url,
        httpVersion: UNKNOWN_HTTP_VERSION,
        cookies: requestCookiesOf(detail, options),
        headers: headersOf(detail.requestHeaders, options),
        queryString: queryOf(detail.summary.url),
        headersSize: UNKNOWN_SIZE,
        ...requestBodyOf(detail),
    };
}

function responseOf(detail: TimelineEntryDetail, options: HarOptions): HarResponse {
    const summary = detail.summary;
    const content = {
        size: byteSize(detail.responseBody),
        mimeType: summary.mimeType === ''
            ? (HeaderLookup.find(detail.responseHeaders, HEADER_NAMES.ContentType) ?? '')
            : summary.mimeType,
        ...(detail.responseBody == null
            ? {}
            : {
                text: detail.responseBody,
            }),
        ...(detail.responseBodyNote == null
            ? {}
            : {
                comment: detail.responseBodyNote,
            }),
    };

    return {
        status: summary.statusCode ?? NO_STATUS,
        statusText: summary.statusText,
        httpVersion: UNKNOWN_HTTP_VERSION,
        cookies: responseCookiesOf(detail, options),
        headers: headersOf(detail.responseHeaders, options),
        content,
        redirectURL: HeaderLookup.find(detail.responseHeaders, HEADER_NAMES.Location) ?? '',
        headersSize: UNKNOWN_SIZE,
        bodySize: UNKNOWN_SIZE,
    };
}

function entryOf(detail: TimelineEntryDetail, options: HarOptions): HarEntry {
    const summary = detail.summary;
    const time = summary.durationInMilliseconds ?? NO_DURATION;
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

    return summary.errorText == null
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
                version: HAR_VERSION,
                creator: {
                    name: CREATOR_NAME,
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
