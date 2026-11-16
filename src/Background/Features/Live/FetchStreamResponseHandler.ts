import type { Protocol } from 'devtools-protocol';
import type { Logger } from '../../../Common/Logging/Logger';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import { WORKER_EVENT_TYPE } from '../../../Contracts/Messaging/WorkerEventType';
import type { TimelineStore } from '../Capture/TimelineStore';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { DebuggerClient } from '../Debugging/DebuggerClient';
import type { PanelConnectionHub } from '../PanelConnections/PanelConnectionHub';
import type { EventStreamParsers } from './EventStreamParsers';
import { EventStreamMessages } from './EventStreamMessages';
import type { LiveStore } from './LiveStore';

const EVENT_STREAM_MIME = 'text/event-stream';
const STREAMED_TYPES = new Set([
    'Fetch',
    'XHR',
]);

export interface FetchStreamResponseHandlerDependencies {
    liveStore: LiveStore;
    parsers: EventStreamParsers;
    timelineStore: TimelineStore;
    connectionHub: PanelConnectionHub;
    debuggerClient: DebuggerClient;
    logger: Logger;
    now: () => Date;
}

export class FetchStreamResponseHandler implements CdpEventHandler<'Network.responseReceived'> {
    readonly event = 'Network.responseReceived';

    private readonly _dependencies: FetchStreamResponseHandlerDependencies;

    constructor(dependencies: FetchStreamResponseHandlerDependencies) {
        this._dependencies = dependencies;
    }

    async handleAsync(tabId: number, params: Protocol.Network.ResponseReceivedEvent): Promise<void> {
        const isStream = STREAMED_TYPES.has(params.type)
            && params.response.mimeType.toLowerCase() === EVENT_STREAM_MIME;
        if (!isStream) {
            return;
        }

        const {
            liveStore,
            parsers,
            timelineStore,
            connectionHub,
            debuggerClient,
            logger,
            now,
        } = this._dependencies;
        liveStore.upsertChannel({
            id: params.requestId,
            tabId,
            kind: LIVE_CHANNEL_KIND.EventStream,
            url: params.response.url,
            isOpen: true,
            isMine: false,
            openedAt: now().toISOString(),
        });
        timelineStore.remove(tabId, params.requestId);
        connectionHub.publishToTab(
            /* tabId: */ tabId,
            /* event: */ {
                type: WORKER_EVENT_TYPE.EntryRemoved,
                tabId,
                entryId: params.requestId,
            },
        );
        parsers.start(tabId, params.requestId);

        const streamed = await debuggerClient.sendAsync(
            /* tabId: */ tabId,
            /* command: */ 'Network.streamResourceContent',
            /* params: */ {
                requestId: params.requestId,
            },
        );
        if (streamed.hasErrors) {
            logger.warn(`Reading the event stream ${params.response.url} failed.`, streamed.error);

            return;
        }

        const events = parsers.feed({
            tabId,
            requestId: params.requestId,
            base64: streamed.value.bufferedData,
        }) ?? [];
        events.forEach(event => liveStore.addMessage(
            /* tabId: */ tabId,
            /* draft: */ EventStreamMessages.toDraft({
                requestId: params.requestId,
                event,
                at: now(),
            }),
        ));
    }
}
