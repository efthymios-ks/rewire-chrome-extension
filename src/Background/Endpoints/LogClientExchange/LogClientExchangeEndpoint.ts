import type { ContentKindClassifier } from '../../../Common/Content/ContentKindClassifier';
import { ByteSize } from '../../../Common/Encoding/ByteSize';
import { HeaderLookup } from '../../../Common/Http/HeaderLookup';
import { Result } from '../../../Common/Results/Result';
import { requestLocationOf } from '../../../Common/Urls/requestLocationOf';
import { HEADER_NAMES } from '../../../Contracts/Http/HeaderNames';
import type { LogClientExchangeCommand } from '../../../Contracts/Messaging/Commands/LogClientExchangeCommand';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { CONTENT_KIND } from '../../../Contracts/Timeline/ContentKind';
import { TIMELINE_ENTRY_STATE } from '../../../Contracts/Timeline/TimelineEntryState';
import type { TimelineStore } from '../../Features/Capture/TimelineStore';
import type { TimelineRecord } from '../../Features/Capture/TimelineRecord';
import type { PanelEndpoint } from '../PanelEndpoint';

const CLIENT_RESOURCE_TYPE = 'Fetch';

export class LogClientExchangeEndpoint implements PanelEndpoint<typeof PANEL_COMMAND_TYPE.LogClientExchange> {
    readonly commandType = PANEL_COMMAND_TYPE.LogClientExchange;

    private readonly _timelineStore: TimelineStore;
    private readonly _classifier: ContentKindClassifier;

    constructor(timelineStore: TimelineStore, classifier: ContentKindClassifier) {
        this._timelineStore = timelineStore;
        this._classifier = classifier;
    }

    async handleAsync(command: LogClientExchangeCommand): Promise<Result<void>> {
        this._timelineStore.add(this.recordOf(command));

        return Result.done();
    }

    private recordOf(command: LogClientExchangeCommand): TimelineRecord {
        const requestBody = command.request.body === '' ? null : command.request.body;
        const requestContentType = HeaderLookup.find(command.request.headers, HEADER_NAMES.ContentType) ?? '';
        const responseHeaders = command.response?.headers ?? [];
        const responseMimeType = HeaderLookup.find(responseHeaders, HEADER_NAMES.ContentType) ?? '';
        const contentKind = command.error == null
            ? this._classifier.classify({
                url: command.request.url,
                requestContentType,
                responseMimeType,
                requestBody,
            })
            : CONTENT_KIND.Other;

        return {
            summary: {
                id: command.entryId,
                tabId: command.tabId,
                ...requestLocationOf(command.request.method, command.request.url),
                resourceType: CLIENT_RESOURCE_TYPE,
                contentKind,
                state: command.error == null ? TIMELINE_ENTRY_STATE.Completed : TIMELINE_ENTRY_STATE.Failed,
                statusCode: command.response?.status ?? null,
                statusText: command.response?.statusText ?? '',
                mimeType: responseMimeType,
                startedAt: command.startedAt,
                durationInMilliseconds: command.response?.durationInMilliseconds ?? null,
                appliedRules: [],
                isAnsweredByRule: false,
                redirectedFromUrl: null,
                errorText: command.error,
                frame: null,
            },
            requestHeaders: command.request.headers,
            rawRequestHeaders: null,
            requestContentType,
            requestBody,
            requestBodyNote: null,
            requestBodyBase64: null,
            requestBodyByteSize: requestBody == null ? null : ByteSize.ofText(requestBody),
            responseHeaders: command.response?.headers ?? [],
            rawResponseHeaders: null,
            responseBody: command.response?.body ?? null,
            responseBodyNote: null,
            changes: [],
            startedTimestamp: 0,
        };
    }
}
