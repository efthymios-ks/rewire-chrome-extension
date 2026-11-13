import type { Protocol } from "devtools-protocol";
import { LiveChannelKind } from "../../../Contracts/Live/LiveChannelKind";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { ILiveStore } from "./LiveStore";

export class WebSocketCreatedHandler implements ICdpEventHandler<"Network.webSocketCreated"> {
    readonly event = "Network.webSocketCreated";

    private readonly _liveStore: ILiveStore;
    private readonly _now: () => Date;

    constructor(liveStore: ILiveStore, now: () => Date) {
        this._liveStore = liveStore;
        this._now = now;
    }

    async handle(tabId: number, params: Protocol.Network.WebSocketCreatedEvent): Promise<void> {
        this._liveStore.upsertChannel({
            id: params.requestId,
            tabId,
            kind: LiveChannelKind.WebSocket,
            url: params.url,
            isOpen: true,
            isMine: false,
            openedAt: this._now().toISOString(),
        });
    }
}
