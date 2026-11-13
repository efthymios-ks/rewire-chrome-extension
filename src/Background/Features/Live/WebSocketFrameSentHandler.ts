import type { Protocol } from "devtools-protocol";
import { LiveMessageDirection } from "../../../Contracts/Live/LiveMessageDirection";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { ILiveStore } from "./LiveStore";
import { WebSocketFrames } from "./WebSocketFrames";

export class WebSocketFrameSentHandler implements ICdpEventHandler<"Network.webSocketFrameSent"> {
    readonly event = "Network.webSocketFrameSent";

    private readonly _liveStore: ILiveStore;
    private readonly _now: () => Date;

    constructor(liveStore: ILiveStore, now: () => Date) {
        this._liveStore = liveStore;
        this._now = now;
    }

    async handle(tabId: number, params: Protocol.Network.WebSocketFrameSentEvent): Promise<void> {
        this._liveStore.addMessage(
            tabId,
            WebSocketFrames.toDraft(
                params.requestId,
                LiveMessageDirection.Sent,
                params.response,
                this._now()
            )
        );
    }
}
