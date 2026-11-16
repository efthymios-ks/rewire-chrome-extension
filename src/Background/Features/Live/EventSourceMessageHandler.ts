import type { Protocol } from 'devtools-protocol';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import { EventStreamMessages } from './EventStreamMessages';
import type { LiveStore } from './LiveStore';

const DEFAULT_EVENT_NAME = 'message';

export class EventSourceMessageHandler implements CdpEventHandler<'Network.eventSourceMessageReceived'> {
    readonly event = 'Network.eventSourceMessageReceived';

    private readonly _liveStore: LiveStore;
    private readonly _now: () => Date;

    constructor(liveStore: LiveStore, now: () => Date) {
        this._liveStore = liveStore;
        this._now = now;
    }

    async handleAsync(
        tabId: number,
        params: Protocol.Network.EventSourceMessageReceivedEvent,
    ): Promise<void> {
        this._liveStore.addMessage(
            /* tabId: */ tabId,
            /* draft: */ EventStreamMessages.toDraft({
                requestId: params.requestId,
                event: {
                    event: params.eventName === DEFAULT_EVENT_NAME ? null : params.eventName,
                    id: params.eventId === '' ? null : params.eventId,
                    retry: null,
                    data: params.data,
                },
                at: this._now(),
            }),
        );
    }
}
