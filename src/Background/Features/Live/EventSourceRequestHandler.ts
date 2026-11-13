import type { Protocol } from "devtools-protocol";
import { LiveChannelKind } from "../../../Contracts/Live/LiveChannelKind";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { ILiveStore } from "./LiveStore";

const EventSourceType = "EventSource";

export class EventSourceRequestHandler implements ICdpEventHandler<"Network.requestWillBeSent"> {
    readonly event = "Network.requestWillBeSent";

    private readonly _liveStore: ILiveStore;
    private readonly _now: () => Date;

    constructor(liveStore: ILiveStore, now: () => Date) {
        this._liveStore = liveStore;
        this._now = now;
    }

    async handle(tabId: number, params: Protocol.Network.RequestWillBeSentEvent): Promise<void> {
        if (params.type !== EventSourceType) {
            return;
        }

        this._liveStore.upsertChannel({
            id: params.requestId,
            tabId,
            kind: LiveChannelKind.EventStream,
            url: params.request.url,
            isOpen: true,
            isMine: false,
            openedAt: this._now().toISOString(),
        });
    }
}
