import type { Protocol } from "devtools-protocol";
import { HeaderLookup } from "../../../Common/Http/HeaderLookup";
import { EndpointKey } from "../../../Common/Urls/EndpointKey";
import { SafeUrl } from "../../../Common/Urls/SafeUrl";
import { HeaderNames } from "../../../Contracts/Http/HeaderNames";
import { ContentKind } from "../../../Contracts/Timeline/ContentKind";
import { TimelineEntryState } from "../../../Contracts/Timeline/TimelineEntryState";
import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";
import type { IFrameRegistry } from "../Frames/FrameRegistry";
import { Durations } from "./Durations";
import type { ITimelineRecordClassifier } from "./TimelineRecordClassifier";
import type { TimelineRecord } from "./TimelineRecord";

const MillisecondsPerSecond = 1000;

type RequestLocation = Pick<TimelineEntrySummary, "method" | "url" | "host" | "path" | "endpointKey">;

function locationOf(request: Protocol.Network.Request): RequestLocation {
    const parsed = SafeUrl.parse(request.url);

    return {
        method: request.method,
        url: request.url,
        host: parsed?.hostname ?? "",
        path: parsed === null ? request.url : `${parsed.pathname}${parsed.search}`,
        endpointKey: EndpointKey.create(request.method, request.url),
    };
}

export interface ITimelineRecordFactory {
    create(tabId: number, event: Protocol.Network.RequestWillBeSentEvent): TimelineRecord;
    redirect(record: TimelineRecord, event: Protocol.Network.RequestWillBeSentEvent): TimelineRecord;
    toCompletedLeg(
        base: TimelineRecord,
        legId: string,
        response: Protocol.Network.Response,
        endedTimestamp: number
    ): TimelineRecord;
}

export class TimelineRecordFactory implements ITimelineRecordFactory {
    private readonly _recordClassifier: ITimelineRecordClassifier;
    private readonly _frameRegistry: IFrameRegistry;

    constructor(recordClassifier: ITimelineRecordClassifier, frameRegistry: IFrameRegistry) {
        this._recordClassifier = recordClassifier;
        this._frameRegistry = frameRegistry;
    }

    create(tabId: number, event: Protocol.Network.RequestWillBeSentEvent): TimelineRecord {
        const requestHeaders = HeaderLookup.fromRecord(event.request.headers);

        return this._recordClassifier.reclassify({
            summary: {
                id: event.requestId,
                tabId,
                ...locationOf(event.request),
                resourceType: event.type ?? "",
                contentKind: ContentKind.Other,
                state: TimelineEntryState.Pending,
                statusCode: null,
                statusText: "",
                mimeType: "",
                startedAt: new Date(event.wallTime * MillisecondsPerSecond).toISOString(),
                durationInMilliseconds: null,
                appliedRules: [],
                isAnsweredByRule: false,
                redirectedFromUrl: null,
                errorText: null,
                frame: this._frameRegistry.frameOf(
                    tabId,
                    event.frameId,
                    event.documentURL
                ),
            },
            requestHeaders,
            rawRequestHeaders: null,
            requestContentType: HeaderLookup.find(requestHeaders, HeaderNames.ContentType) ?? "",
            requestBody: event.request.postData ?? null,
            responseHeaders: [],
            rawResponseHeaders: null,
            responseBody: null,
            responseBodyNote: null,
            changes: [],
            startedTimestamp: event.timestamp,
        });
    }

    redirect(record: TimelineRecord, event: Protocol.Network.RequestWillBeSentEvent): TimelineRecord {
        const requestHeaders = HeaderLookup.fromRecord(event.request.headers);

        return this._recordClassifier.reclassify({
            ...record,
            summary: {
                ...record.summary,
                ...locationOf(event.request),
                state: TimelineEntryState.Pending,
                statusCode: null,
                statusText: "",
                mimeType: "",
                durationInMilliseconds: null,
                redirectedFromUrl: record.summary.url,
                appliedRules: [],
                isAnsweredByRule: false,
                errorText: null,
            },
            requestHeaders,
            rawRequestHeaders: null,
            requestContentType: HeaderLookup.find(requestHeaders, HeaderNames.ContentType) ?? "",
            responseHeaders: [],
            rawResponseHeaders: null,
            responseBody: null,
            responseBodyNote: null,
            changes: [],
            startedTimestamp: event.timestamp,
        });
    }

    toCompletedLeg(
        base: TimelineRecord,
        legId: string,
        response: Protocol.Network.Response,
        endedTimestamp: number
    ): TimelineRecord {
        const responseHeaders = HeaderLookup.fromRecord(response.headers);

        return {
            ...base,
            summary: {
                ...base.summary,
                id: legId,
                state: TimelineEntryState.Completed,
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
