import type { Protocol } from 'devtools-protocol';
import { TIMELINE_ENTRY_STATE } from '../../../Contracts/Timeline/TimelineEntryState';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import { Durations } from './Durations';
import type { TimelineStore } from './TimelineStore';

const CANCELED_ERROR_TEXT = 'Canceled';

export class LoadingFailedHandler implements CdpEventHandler<'Network.loadingFailed'> {
    readonly event = 'Network.loadingFailed';

    private readonly _timelineStore: TimelineStore;

    constructor(timelineStore: TimelineStore) {
        this._timelineStore = timelineStore;
    }

    async handleAsync(tabId: number, event: Protocol.Network.LoadingFailedEvent): Promise<void> {
        const errorText = event.canceled === true ? CANCELED_ERROR_TEXT : event.errorText;
        this._timelineStore.update({
            tabId,
            entryId: event.requestId,
            change: record => ({
                ...record,
                summary: {
                    ...record.summary,
                    state: TIMELINE_ENTRY_STATE.Failed,
                    errorText,
                    durationInMilliseconds: Durations.betweenTimestamps(
                        /* startedTimestamp: */ record.startedTimestamp,
                        /* endedTimestamp: */ event.timestamp,
                    ),
                },
            }),
        });
    }
}
