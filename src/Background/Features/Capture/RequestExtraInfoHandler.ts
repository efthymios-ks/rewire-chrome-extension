import type { Protocol } from 'devtools-protocol';
import { HeaderLookup } from '../../../Common/Http/HeaderLookup';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { TimelineStore } from './TimelineStore';

export class RequestExtraInfoHandler implements CdpEventHandler<'Network.requestWillBeSentExtraInfo'> {
    readonly event = 'Network.requestWillBeSentExtraInfo';

    private readonly _timelineStore: TimelineStore;

    constructor(timelineStore: TimelineStore) {
        this._timelineStore = timelineStore;
    }

    async handleAsync(tabId: number, event: Protocol.Network.RequestWillBeSentExtraInfoEvent): Promise<void> {
        const rawRequestHeaders = HeaderLookup.fromRawRecord(event.headers);

        this._timelineStore.updateOrDefer({
            tabId,
            entryId: event.requestId,
            change: record => ({
                ...record,
                rawRequestHeaders,
            }),
        });
    }
}
