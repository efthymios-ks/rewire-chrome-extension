import type { Protocol } from 'devtools-protocol';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { LiveStore } from './LiveStore';

export class WebSocketClosedHandler implements CdpEventHandler<'Network.webSocketClosed'> {
    readonly event = 'Network.webSocketClosed';

    private readonly _liveStore: LiveStore;

    constructor(liveStore: LiveStore) {
        this._liveStore = liveStore;
    }

    async handleAsync(tabId: number, params: Protocol.Network.WebSocketClosedEvent): Promise<void> {
        const channel = this._liveStore.channelOf(tabId, params.requestId);
        if (channel == null) {
            return;
        }

        this._liveStore.upsertChannel({
            ...channel,
            isOpen: false,
        });
    }
}
