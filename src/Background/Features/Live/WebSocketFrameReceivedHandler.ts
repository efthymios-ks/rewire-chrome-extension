import type { Protocol } from 'devtools-protocol';
import { LIVE_MESSAGE_DIRECTION } from '../../../Contracts/Live/LiveMessageDirection';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { LiveStore } from './LiveStore';
import { WebSocketFrames } from './WebSocketFrames';

export class WebSocketFrameReceivedHandler implements CdpEventHandler<'Network.webSocketFrameReceived'> {
    readonly event = 'Network.webSocketFrameReceived';

    private readonly _liveStore: LiveStore;
    private readonly _now: () => Date;

    constructor(liveStore: LiveStore, now: () => Date) {
        this._liveStore = liveStore;
        this._now = now;
    }

    async handleAsync(tabId: number, params: Protocol.Network.WebSocketFrameReceivedEvent): Promise<void> {
        this._liveStore.addMessage(
            /* tabId: */ tabId,
            /* draft: */ WebSocketFrames.toDraft({
                requestId: params.requestId,
                direction: LIVE_MESSAGE_DIRECTION.Received,
                frame: params.response,
                at: this._now(),
            }),
        );
    }
}
