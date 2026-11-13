import type { Protocol } from "devtools-protocol";
import type { ILogger } from "../../../Common/Logging/ILogger";
import { LiveChannelKind } from "../../../Contracts/Live/LiveChannelKind";
import { WorkerEventType } from "../../../Contracts/Messaging/WorkerEventType";
import type { ITimelineStore } from "../Capture/ITimelineStore";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { IDebuggerClient } from "../Debugging/IDebuggerClient";
import type { IPanelConnectionHub } from "../PanelConnections/PanelConnectionHub";
import type { IEventStreamParsers } from "./EventStreamParsers";
import { EventStreamMessages } from "./EventStreamMessages";
import type { ILiveStore } from "./LiveStore";

const EventStreamMime = "text/event-stream";
const StreamedTypes = new Set([
    "Fetch",
    "XHR",
]);

export interface FetchStreamResponseDependencies {
    liveStore: ILiveStore;
    parsers: IEventStreamParsers;
    timelineStore: ITimelineStore;
    connectionHub: IPanelConnectionHub;
    debuggerClient: IDebuggerClient;
    logger: ILogger;
    now: () => Date;
}

export class FetchStreamResponseHandler implements ICdpEventHandler<"Network.responseReceived"> {
    readonly event = "Network.responseReceived";

    private readonly _dependencies: FetchStreamResponseDependencies;

    constructor(dependencies: FetchStreamResponseDependencies) {
        this._dependencies = dependencies;
    }

    async handle(tabId: number, params: Protocol.Network.ResponseReceivedEvent): Promise<void> {
        const isStream = StreamedTypes.has(params.type) && params.response.mimeType.toLowerCase() === EventStreamMime;
        if (!isStream) {
            return;
        }

        const { liveStore, parsers, timelineStore, connectionHub, debuggerClient, logger, now } = this._dependencies;
        liveStore.upsertChannel({
            id: params.requestId,
            tabId,
            kind: LiveChannelKind.EventStream,
            url: params.response.url,
            isOpen: true,
            isMine: false,
            openedAt: now().toISOString(),
        });
        timelineStore.remove(tabId, params.requestId);
        connectionHub.publishToTab(
            tabId,
            {
                type: WorkerEventType.EntryRemoved,
                tabId,
                entryId: params.requestId,
            }
        );
        parsers.start(tabId, params.requestId);

        const streamed = await debuggerClient.send(
            tabId,
            "Network.streamResourceContent",
            {
                requestId: params.requestId,
            }
        );
        if (streamed.hasErrors) {
            logger.warn(`Reading the event stream ${params.response.url} failed.`, streamed.error);

            return;
        }

        const events = parsers.feed(
            tabId,
            params.requestId,
            streamed.value.bufferedData
        ) ?? [];
        events.forEach(event => liveStore.addMessage(
            tabId,
            EventStreamMessages.toDraft(
                params.requestId,
                event,
                now()
            )
        ));
    }
}
