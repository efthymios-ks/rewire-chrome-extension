import type { Protocol } from 'devtools-protocol';
import { HeaderLookup } from '../../../Common/Http/HeaderLookup';
import { type RequestLocation, requestLocationOf } from '../../../Common/Urls/requestLocationOf';
import { HEADER_NAMES } from '../../../Contracts/Http/HeaderNames';
import { CONTENT_KIND } from '../../../Contracts/Timeline/ContentKind';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import { TIMELINE_ENTRY_STATE } from '../../../Contracts/Timeline/TimelineEntryState';
import type { TimelineEntrySummary } from '../../../Contracts/Timeline/TimelineEntrySummary';
import type { FrameRegistry } from '../Frames/FrameRegistry';
import type { CapturedRequestBody } from './CapturedRequestBody';
import { Durations } from './Durations';
import { RequestBodyDecoder } from './RequestBodyDecoder';
import { RequestPostData } from './RequestPostData';
import type { TimelineRecord } from './TimelineRecord';
import type { TimelineRecordClassifier } from './TimelineRecordClassifier';
import type { TimelineRecordFactory, ToCompletedLegOptions } from './TimelineRecordFactory';

const MILLISECONDS_PER_SECOND = 1000;

const NO_REQUEST_BODY: CapturedRequestBody = Object.freeze({
    requestBody: null,
    requestBodyNote: null,
    requestBodyBase64: null,
    requestBodyByteSize: null,
});

type PendingSummary = RequestLocation & Pick<
    TimelineEntrySummary,
    | 'state'
    | 'statusCode'
    | 'statusText'
    | 'mimeType'
    | 'durationInMilliseconds'
    | 'appliedRules'
    | 'isAnsweredByRule'
    | 'errorText'
>;

type PendingExchange = Omit<TimelineRecord, 'summary' | keyof CapturedRequestBody>;

function pendingSummaryOf(request: Protocol.Network.Request): PendingSummary {
    return {
        ...requestLocationOf(request.method, request.url),
        state: TIMELINE_ENTRY_STATE.Pending,
        statusCode: null,
        statusText: '',
        mimeType: '',
        durationInMilliseconds: null,
        appliedRules: [],
        isAnsweredByRule: false,
        errorText: null,
    };
}

function pendingExchangeOf(event: Protocol.Network.RequestWillBeSentEvent): PendingExchange {
    const requestHeaders = HeaderLookup.fromRecord(event.request.headers);

    return {
        requestHeaders,
        rawRequestHeaders: null,
        requestContentType: HeaderLookup.find(requestHeaders, HEADER_NAMES.ContentType) ?? '',
        responseHeaders: [],
        rawResponseHeaders: null,
        responseBody: null,
        responseBodyNote: null,
        changes: [],
        startedTimestamp: event.timestamp,
    };
}

function requestBodyOf(request: Protocol.Network.Request, headers: HeaderEntry[]): CapturedRequestBody {
    const bytes = RequestPostData.bytesOf(request);
    if (bytes == null) {
        return {
            requestBody: request.postData ?? null,
            requestBodyNote: null,
            requestBodyBase64: null,
            requestBodyByteSize: null,
        };
    }

    return RequestBodyDecoder.decode({ bytes, headers });
}

function redirectedBodyOf(record: TimelineRecord, request: Protocol.Network.Request): CapturedRequestBody {
    // A redirect that turns the request into a GET drops the body; one that keeps the method resends it.
    if (record.summary.method !== request.method) {
        return NO_REQUEST_BODY;
    }

    return {
        requestBody: record.requestBody,
        requestBodyNote: record.requestBodyNote,
        requestBodyBase64: record.requestBodyBase64,
        requestBodyByteSize: record.requestBodyByteSize,
    };
}

export class DefaultTimelineRecordFactory implements TimelineRecordFactory {
    private readonly _recordClassifier: TimelineRecordClassifier;
    private readonly _frameRegistry: FrameRegistry;

    constructor(recordClassifier: TimelineRecordClassifier, frameRegistry: FrameRegistry) {
        this._recordClassifier = recordClassifier;
        this._frameRegistry = frameRegistry;
    }

    create(tabId: number, event: Protocol.Network.RequestWillBeSentEvent): TimelineRecord {
        const exchange = pendingExchangeOf(event);

        return this._recordClassifier.reclassify({
            summary: {
                id: event.requestId,
                tabId,
                ...pendingSummaryOf(event.request),
                resourceType: event.type ?? '',
                contentKind: CONTENT_KIND.Other,
                startedAt: new Date(event.wallTime * MILLISECONDS_PER_SECOND).toISOString(),
                redirectedFromUrl: null,
                frame: this._frameRegistry.frameOf({
                    tabId,
                    frameId: event.frameId,
                    documentUrl: event.documentURL,
                }),
            },
            ...exchange,
            ...requestBodyOf(event.request, exchange.requestHeaders),
        });
    }

    redirect(record: TimelineRecord, event: Protocol.Network.RequestWillBeSentEvent): TimelineRecord {
        return this._recordClassifier.reclassify({
            ...record,
            summary: {
                ...record.summary,
                ...pendingSummaryOf(event.request),
                redirectedFromUrl: record.summary.url,
            },
            ...pendingExchangeOf(event),
            ...redirectedBodyOf(record, event.request),
        });
    }

    toCompletedLeg({ base, legId, response, endedTimestamp }: ToCompletedLegOptions): TimelineRecord {
        const responseHeaders = HeaderLookup.fromRecord(response.headers);

        return {
            ...base,
            summary: {
                ...base.summary,
                id: legId,
                state: TIMELINE_ENTRY_STATE.Completed,
                statusCode: response.status,
                statusText: response.statusText,
                mimeType: response.mimeType,
                durationInMilliseconds: Durations.betweenTimestamps(base.startedTimestamp, endedTimestamp),
            },
            responseHeaders,
            rawResponseHeaders: responseHeaders,
            responseBody: null,
            responseBodyNote: null,
        };
    }
}
