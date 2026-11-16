import type { Protocol } from 'devtools-protocol';
import { HeaderLookup } from '../../../Common/Http/HeaderLookup';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { TimelineStore } from './TimelineStore';

export class ResponseExtraInfoHandler implements CdpEventHandler<'Network.responseReceivedExtraInfo'> {
    readonly event = 'Network.responseReceivedExtraInfo';

    private readonly _timelineStore: TimelineStore;

    constructor(timelineStore: TimelineStore) {
        this._timelineStore = timelineStore;
    }

    async handleAsync(tabId: number, event: Protocol.Network.ResponseReceivedExtraInfoEvent): Promise<void> {
        const rawResponseHeaders = HeaderLookup.fromRawRecord(event.headers);

        this._timelineStore.updateOrDefer({
            tabId,
            entryId: event.requestId,
            change: record => ({
                ...record,
                rawResponseHeaders,
            }),
        });
    }
}
