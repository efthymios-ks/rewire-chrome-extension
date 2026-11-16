import type { Protocol } from 'devtools-protocol';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { LiveStore } from './LiveStore';

export class WebSocketCreatedHandler implements CdpEventHandler<'Network.webSocketCreated'> {
    readonly event = 'Network.webSocketCreated';

    private readonly _liveStore: LiveStore;
    private readonly _now: () => Date;

    constructor(liveStore: LiveStore, now: () => Date) {
        this._liveStore = liveStore;
        this._now = now;
    }

    async handleAsync(tabId: number, params: Protocol.Network.WebSocketCreatedEvent): Promise<void> {
        this._liveStore.upsertChannel({
            id: params.requestId,
            tabId,
            kind: LIVE_CHANNEL_KIND.WebSocket,
            url: params.url,
            isOpen: true,
            isMine: false,
            openedAt: this._now().toISOString(),
        });
    }
}
