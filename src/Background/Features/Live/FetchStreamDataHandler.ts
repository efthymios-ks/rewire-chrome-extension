import type { Protocol } from 'devtools-protocol';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { EventStreamParsers } from './EventStreamParsers';
import { EventStreamMessages } from './EventStreamMessages';
import type { LiveStore } from './LiveStore';

export interface FetchStreamDataHandlerDependencies {
    liveStore: LiveStore;
    parsers: EventStreamParsers;
    now: () => Date;
}

export class FetchStreamDataHandler implements CdpEventHandler<'Network.dataReceived'> {
    readonly event = 'Network.dataReceived';

    private readonly _liveStore: LiveStore;
    private readonly _parsers: EventStreamParsers;
    private readonly _now: () => Date;

    constructor({ liveStore, parsers, now }: FetchStreamDataHandlerDependencies) {
        this._liveStore = liveStore;
        this._parsers = parsers;
        this._now = now;
    }

    async handleAsync(tabId: number, params: Protocol.Network.DataReceivedEvent): Promise<void> {
        if (params.data == null) {
            return;
        }

        const events = this._parsers.feed({ tabId, requestId: params.requestId, base64: params.data }) ?? [];
        events.forEach(event => this._liveStore.addMessage(
            /* tabId: */ tabId,
            /* draft: */ EventStreamMessages.toDraft({
                requestId: params.requestId,
                event,
                at: this._now(),
            }),
        ));
    }
}
