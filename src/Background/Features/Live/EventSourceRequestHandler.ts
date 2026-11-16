import type { Protocol } from 'devtools-protocol';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { LiveStore } from './LiveStore';

const EVENT_SOURCE_TYPE = 'EventSource';

export class EventSourceRequestHandler implements CdpEventHandler<'Network.requestWillBeSent'> {
    readonly event = 'Network.requestWillBeSent';

    private readonly _liveStore: LiveStore;
    private readonly _now: () => Date;

    constructor(liveStore: LiveStore, now: () => Date) {
        this._liveStore = liveStore;
        this._now = now;
    }

    async handleAsync(tabId: number, params: Protocol.Network.RequestWillBeSentEvent): Promise<void> {
        if (params.type !== EVENT_SOURCE_TYPE) {
            return;
        }

        this._liveStore.upsertChannel({
            id: params.requestId,
            tabId,
            kind: LIVE_CHANNEL_KIND.EventStream,
            url: params.request.url,
            isOpen: true,
            isMine: false,
            openedAt: this._now().toISOString(),
        });
    }
}
