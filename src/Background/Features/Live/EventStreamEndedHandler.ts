import type { CdpEventParams } from "../Debugging/CdpTypes";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { IEventStreamParsers } from "./EventStreamParsers";
import type { ILiveStore } from "./LiveStore";

export type StreamEndEvent = "Network.loadingFinished" | "Network.loadingFailed";

export class EventStreamEndedHandler<TEventName extends StreamEndEvent> implements ICdpEventHandler<TEventName> {
    readonly event: TEventName;

    private readonly _liveStore: ILiveStore;
    private readonly _parsers: IEventStreamParsers;

    constructor(
        event: TEventName,
        liveStore: ILiveStore,
        parsers: IEventStreamParsers
    ) {
        this.event = event;
        this._liveStore = liveStore;
        this._parsers = parsers;
    }

    async handle(tabId: number, params: CdpEventParams<TEventName>): Promise<void> {
        this._parsers.stop(tabId, params.requestId);
        const channel = this._liveStore.channelOf(tabId, params.requestId);
        if (channel === undefined || !channel.isOpen) {
            return;
        }

        this._liveStore.upsertChannel({
            ...channel,
            isOpen: false,
        });
    }
}
