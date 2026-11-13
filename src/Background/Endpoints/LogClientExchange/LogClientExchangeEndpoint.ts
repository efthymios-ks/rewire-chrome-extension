import type { IContentKindClassifier } from "../../../Common/Content/ContentKindClassifier";
import { HeaderLookup } from "../../../Common/Http/HeaderLookup";
import { Result } from "../../../Common/Results/Result";
import { EndpointKey } from "../../../Common/Urls/EndpointKey";
import { SafeUrl } from "../../../Common/Urls/SafeUrl";
import { HeaderNames } from "../../../Contracts/Http/HeaderNames";
import type { LogClientExchangeCommand } from "../../../Contracts/Messaging/Commands/LogClientExchangeCommand";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import { ContentKind } from "../../../Contracts/Timeline/ContentKind";
import { TimelineEntryState } from "../../../Contracts/Timeline/TimelineEntryState";
import type { ITimelineStore } from "../../Features/Capture/ITimelineStore";
import type { TimelineRecord } from "../../Features/Capture/TimelineRecord";
import type { IPanelEndpoint } from "../IPanelEndpoint";

const ClientResourceType = "Fetch";

export class LogClientExchangeEndpoint implements IPanelEndpoint<PanelCommandType.LogClientExchange> {
    readonly commandType = PanelCommandType.LogClientExchange;

    private readonly _timelineStore: ITimelineStore;
    private readonly _classifier: IContentKindClassifier;

    constructor(timelineStore: ITimelineStore, classifier: IContentKindClassifier) {
        this._timelineStore = timelineStore;
        this._classifier = classifier;
    }

    async handle(command: LogClientExchangeCommand): Promise<Result<void>> {
        this._timelineStore.add(this.recordOf(command));

        return Result.done();
    }

    private recordOf(command: LogClientExchangeCommand): TimelineRecord {
        const url = SafeUrl.parse(command.request.url);
        const requestContentType = HeaderLookup.find(command.request.headers, HeaderNames.ContentType) ?? "";
        const responseMimeType = HeaderLookup.find(command.response?.headers ?? [], HeaderNames.ContentType) ?? "";
        const contentKind = command.error === null
            ? this._classifier.classify({
                url: command.request.url,
                requestContentType,
                responseMimeType,
                requestBody: command.request.body === "" ? null : command.request.body,
            })
            : ContentKind.Other;

        return {
            summary: {
                id: command.entryId,
                tabId: command.tabId,
                method: command.request.method,
                url: command.request.url,
                host: url?.hostname ?? "",
                path: url === null ? command.request.url : `${url.pathname}${url.search}`,
                endpointKey: EndpointKey.create(command.request.method, command.request.url),
                resourceType: ClientResourceType,
                contentKind,
                state: command.error === null ? TimelineEntryState.Completed : TimelineEntryState.Failed,
                statusCode: command.response?.status ?? null,
                statusText: command.response?.statusText ?? "",
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
            requestBody: command.request.body === "" ? null : command.request.body,
            responseHeaders: command.response?.headers ?? [],
            rawResponseHeaders: null,
            responseBody: command.response?.body ?? null,
            responseBodyNote: null,
            changes: [],
            startedTimestamp: 0,
        };
    }
}
