import type { Protocol } from "devtools-protocol";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { IEventStreamParsers } from "./EventStreamParsers";
import { EventStreamMessages } from "./EventStreamMessages";
import type { ILiveStore } from "./LiveStore";

export class FetchStreamDataHandler implements ICdpEventHandler<"Network.dataReceived"> {
    readonly event = "Network.dataReceived";

    private readonly _liveStore: ILiveStore;
    private readonly _parsers: IEventStreamParsers;
    private readonly _now: () => Date;

    constructor(
        liveStore: ILiveStore,
        parsers: IEventStreamParsers,
        now: () => Date
    ) {
        this._liveStore = liveStore;
        this._parsers = parsers;
        this._now = now;
    }

    async handle(tabId: number, params: Protocol.Network.DataReceivedEvent): Promise<void> {
        if (params.data === undefined) {
            return;
        }

        const events = this._parsers.feed(
            tabId,
            params.requestId,
            params.data
        ) ?? [];
        events.forEach(event => this._liveStore.addMessage(
            tabId,
            EventStreamMessages.toDraft(
                params.requestId,
                event,
                this._now()
            )
        ));
    }
}
