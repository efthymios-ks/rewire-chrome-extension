import type { Protocol } from "devtools-protocol";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import { EventStreamMessages } from "./EventStreamMessages";
import type { ILiveStore } from "./LiveStore";

const DefaultEventName = "message";

export class EventSourceMessageHandler implements ICdpEventHandler<"Network.eventSourceMessageReceived"> {
    readonly event = "Network.eventSourceMessageReceived";

    private readonly _liveStore: ILiveStore;
    private readonly _now: () => Date;

    constructor(liveStore: ILiveStore, now: () => Date) {
        this._liveStore = liveStore;
        this._now = now;
    }

    async handle(tabId: number, params: Protocol.Network.EventSourceMessageReceivedEvent): Promise<void> {
        this._liveStore.addMessage(
            tabId,
            EventStreamMessages.toDraft(
                params.requestId,
                {
                    event: params.eventName === DefaultEventName ? null : params.eventName,
                    id: params.eventId === "" ? null : params.eventId,
                    retry: null,
                    data: params.data,
                },
                this._now()
            )
        );
    }
}
