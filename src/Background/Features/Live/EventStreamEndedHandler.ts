import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { CdpEventParams } from '../Debugging/CdpTypes/CdpEventParams';
import type { EventStreamParsers } from './EventStreamParsers';
import type { LiveStore } from './LiveStore';

export type StreamEndEvent = 'Network.loadingFinished' | 'Network.loadingFailed';

export interface EventStreamEndedHandlerOptions<TEventName extends StreamEndEvent> {
    event: TEventName;
    liveStore: LiveStore;
    parsers: EventStreamParsers;
}

export class EventStreamEndedHandler<TEventName extends StreamEndEvent>
    implements CdpEventHandler<TEventName> {
    readonly event: TEventName;

    private readonly _liveStore: LiveStore;
    private readonly _parsers: EventStreamParsers;

    constructor({ event, liveStore, parsers }: EventStreamEndedHandlerOptions<TEventName>) {
        this.event = event;
        this._liveStore = liveStore;
        this._parsers = parsers;
    }

    async handleAsync(tabId: number, params: CdpEventParams<TEventName>): Promise<void> {
        this._parsers.stop(tabId, params.requestId);
        const channel = this._liveStore.channelOf(tabId, params.requestId);
        if (channel == null || !channel.isOpen) {
            return;
        }

        this._liveStore.upsertChannel({
            ...channel,
            isOpen: false,
        });
    }
}
