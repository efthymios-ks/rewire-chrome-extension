import type { Protocol } from "devtools-protocol";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { ILiveStore } from "./LiveStore";

export class WebSocketClosedHandler implements ICdpEventHandler<"Network.webSocketClosed"> {
    readonly event = "Network.webSocketClosed";

    private readonly _liveStore: ILiveStore;

    constructor(liveStore: ILiveStore) {
        this._liveStore = liveStore;
    }

    async handle(tabId: number, params: Protocol.Network.WebSocketClosedEvent): Promise<void> {
        const channel = this._liveStore.channelOf(tabId, params.requestId);
        if (channel === undefined) {
            return;
        }

        this._liveStore.upsertChannel({
            ...channel,
            isOpen: false,
        });
    }
}
