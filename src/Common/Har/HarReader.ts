import { HEADER_NAMES } from '../../Contracts/Http/HeaderNames';
import { HTTP_METHODS } from '../../Contracts/Http/HttpMethods';
import type { ContentKindClassifier } from '../Content/ContentKindClassifier';
import { Base64Text } from '../Encoding/Base64Text';
import { HeaderLookup } from '../Http/HeaderLookup';
import { TextualMime } from '../Http/TextualMime';
import { JsonText } from '../Json/JsonText';
import { OwnEntry } from '../Objects/OwnEntry';
import { RawRecords } from '../Objects/RawRecords';
import { Result } from '../Results/Result';
import { requestLocationOf } from '../Urls/requestLocationOf';
import { SafeUrl } from '../Urls/SafeUrl';
import type { HeaderEntry } from '../../Contracts/Timeline/HeaderEntry';
import type { TimelineEntryDetail } from '../../Contracts/Timeline/TimelineEntryDetail';
import { TIMELINE_ENTRY_STATE } from '../../Contracts/Timeline/TimelineEntryState';
import { HAR_TAB_ID } from './HarTabId';

type RawRecord = Record<string, unknown>;

const ENTRY_ID_PREFIX = 'har-';
const BASE64_ENCODING = 'base64';
const MIME_PARAMETER_SEPARATOR = ';';
const FAILED_STATUS = 0;
const OTHER_RESOURCE_TYPE = 'Other';
const RESOURCE_TYPE_NAMES: Record<string, string> = Object.freeze({
    xhr: 'XHR',
    eventsource: 'EventSource',
    websocket: 'WebSocket',
    cspviolationreport: 'CSPViolationReport',
    signedexchange: 'SignedExchange',
    texttrack: 'TextTrack',
});

function recordOf(record: RawRecord, key: string): RawRecord {
    const value = record[key];

    return RawRecords.is(value) ? value : {};
}

function numberOf(record: RawRecord, key: string): number | null {
    const value = record[key];

    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function headersOf(record: RawRecord): HeaderEntry[] {
    const value = record['headers'];
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter(RawRecords.is)
        .map(header => ({
            name: RawRecords.text(header, 'name'),
            value: RawRecords.text(header, 'value'),
        }))
        .filter(header => header.name !== '');
}

function resourceTypeOf(entry: RawRecord): string {
    const raw = RawRecords.text(entry, '_resourceType').toLowerCase();
    if (raw === '') {
        return OTHER_RESOURCE_TYPE;
    }

    return OwnEntry.of(RESOURCE_TYPE_NAMES, raw) ?? `${raw.charAt(0).toUpperCase()}${raw.slice(1)}`;
}

interface HarBody {
    body: string | null;
    note: string | null;
}

interface TextBodyOptions {
    holder: RawRecord;
    text: string;
    mimeType: string;
    size: number;
}

function decodedBase64(text: string, mimeType: string): string | null {
    if (!TextualMime.isTextual(mimeType)) {
        return null;
    }

    try {
        return Base64Text.toUtf8(text);
    } catch {
        return null;
    }
}

function textBodyOf({ holder, text, mimeType, size }: TextBodyOptions): HarBody {
    if (RawRecords.text(holder, 'encoding') !== BASE64_ENCODING) {
        return {
            body: text,
            note: null,
        };
    }

    const decoded = decodedBase64(text, mimeType);

    return decoded == null
        ? {
            body: null,
            note: `Binary body (${size} bytes), not shown.`,
        }
        : {
            body: decoded,
            note: null,
        };
}

function mimeTypeOf(holder: RawRecord, headers: HeaderEntry[]): string {
    const holderMimeType = RawRecords.text(holder, 'mimeType');
    const declared = holderMimeType === ''
        ? (HeaderLookup.find(headers, HEADER_NAMES.ContentType) ?? '')
        : holderMimeType;

    return declared.split(MIME_PARAMETER_SEPARATOR)[0]?.trim() ?? '';
}

function commentOf(holder: RawRecord): string | null {
    const comment = RawRecords.text(holder, 'comment');

    return comment === '' ? null : comment;
}

function sentByteSizeOf(request: RawRecord): number | null {
    const bodySize = numberOf(request, 'bodySize');

    return bodySize == null || bodySize < 0 ? null : bodySize;
}

function requestBodyOf(request: RawRecord, headers: HeaderEntry[]): HarBody {
    const postData = recordOf(request, 'postData');
    const text = postData['text'];
    if (typeof text === 'string') {
        const body = textBodyOf({
            holder: postData,
            text,
            mimeType: mimeTypeOf(postData, headers),
            size: sentByteSizeOf(request) ?? 0,
        });

        return {
            body: body.body,
            note: body.note ?? commentOf(postData),
        };
    }

    const params = postData['params'];
    if (!Array.isArray(params)) {
        return {
            body: null,
            note: commentOf(postData),
        };
    }

    return {
        body: new URLSearchParams(params
            .filter(RawRecords.is)
            .map(param => [
                RawRecords.text(param, 'name'),
                RawRecords.text(param, 'value'),
            ])).toString(),
        note: null,
    };
}

function responseBodyOf(content: RawRecord, mimeType: string): HarBody {
    const text = content['text'];
    if (typeof text !== 'string') {
        return {
            body: null,
            note: commentOf(content),
        };
    }

    return textBodyOf({
        holder: content,
        text,
        mimeType,
        size: numberOf(content, 'size') ?? 0,
    });
}

interface DetailOfOptions {
    entry: RawRecord;
    index: number;
    classifier: ContentKindClassifier;
}

function detailOf({ entry, index, classifier }: DetailOfOptions): TimelineEntryDetail | null {
    const request = recordOf(entry, 'request');
    const response = recordOf(entry, 'response');
    const url = RawRecords.text(request, 'url');
    if (SafeUrl.parse(url) == null) {
        return null;
    }

    const rawMethod = RawRecords.text(request, 'method');
    const method = (rawMethod === '' ? HTTP_METHODS.Get : rawMethod).toUpperCase();
    const requestHeaders = headersOf(request);
    const responseHeaders = headersOf(response);
    const content = recordOf(response, 'content');
    const mimeType = mimeTypeOf(content, responseHeaders);
    const requestBody = requestBodyOf(request, requestHeaders);
    const responseBody = responseBodyOf(content, mimeType);
    const status = numberOf(response, 'status') ?? FAILED_STATUS;
    const entryError = RawRecords.text(entry, '_error');
    const error = entryError === '' ? RawRecords.text(response, '_error') : entryError;
    const hasFailed = status === FAILED_STATUS || error !== '';
    const errorText = error === '' ? 'Failed' : error;
    const time = numberOf(entry, 'time');

    return {
        summary: {
            id: `${ENTRY_ID_PREFIX}${index + 1}`,
            tabId: HAR_TAB_ID,
            ...requestLocationOf(method, url),
            resourceType: resourceTypeOf(entry),
            contentKind: classifier.classify({
                url,
                requestContentType: HeaderLookup.find(requestHeaders, HEADER_NAMES.ContentType) ?? '',
                responseMimeType: mimeType,
                requestBody: requestBody.body,
            }),
            state: hasFailed ? TIMELINE_ENTRY_STATE.Failed : TIMELINE_ENTRY_STATE.Completed,
            statusCode: hasFailed ? null : status,
            statusText: RawRecords.text(response, 'statusText'),
            mimeType,
            startedAt: RawRecords.text(entry, 'startedDateTime'),
            durationInMilliseconds: time == null || time < 0 ? null : Math.round(time),
            appliedRules: [],
            isAnsweredByRule: false,
            redirectedFromUrl: null,
            errorText: hasFailed ? errorText : null,
            frame: null,
        },
        requestHeaders,
        requestBody: requestBody.body,
        requestBodyNote: requestBody.note,
        requestBodyBase64: null,
        requestBodyByteSize: sentByteSizeOf(request),
        responseHeaders,
        responseBody: responseBody.body,
        responseBodyNote: responseBody.note,
        changes: [],
    };
}

function startOf(detail: TimelineEntryDetail): number {
    const start = Date.parse(detail.summary.startedAt);

    return Number.isNaN(start) ? 0 : start;
}

export const HarReader = {
    read(text: string, classifier: ContentKindClassifier): Result<TimelineEntryDetail[]> {
        const parsed = JsonText.tryParse(text);
        if (parsed.hasErrors) {
            return Result.fail("it isn't valid JSON");
        }

        const log = RawRecords.is(parsed.value) ? recordOf(parsed.value, 'log') : {};
        const entries = log['entries'];
        if (!Array.isArray(entries)) {
            return Result.fail('it has no log.entries list');
        }

        return Result.ok(entries
            .filter(RawRecords.is)
            .map((entry, index) => detailOf({ entry, index, classifier }))
            .filter((detail): detail is TimelineEntryDetail => detail != null)
            .sort((left, right) => startOf(left) - startOf(right)));
    },
};
