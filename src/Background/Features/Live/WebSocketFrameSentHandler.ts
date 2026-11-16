import type { Protocol } from 'devtools-protocol';
import { LIVE_MESSAGE_DIRECTION } from '../../../Contracts/Live/LiveMessageDirection';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { LiveStore } from './LiveStore';
import { WebSocketFrames } from './WebSocketFrames';

export class WebSocketFrameSentHandler implements CdpEventHandler<'Network.webSocketFrameSent'> {
    readonly event = 'Network.webSocketFrameSent';

    private readonly _liveStore: LiveStore;
    private readonly _now: () => Date;

    constructor(liveStore: LiveStore, now: () => Date) {
        this._liveStore = liveStore;
        this._now = now;
    }

    async handleAsync(tabId: number, params: Protocol.Network.WebSocketFrameSentEvent): Promise<void> {
        this._liveStore.addMessage(
            /* tabId: */ tabId,
            /* draft: */ WebSocketFrames.toDraft({
                requestId: params.requestId,
                direction: LIVE_MESSAGE_DIRECTION.Sent,
                frame: params.response,
                at: this._now(),
            }),
        );
    }
}
