import type { Protocol } from 'devtools-protocol';
import { TIMELINE_ENTRY_STATE } from '../../../Contracts/Timeline/TimelineEntryState';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import { Durations } from './Durations';
import type { TimelineStore } from './TimelineStore';
import type { ResponseBodyReader } from './ResponseBodyReader';

export class LoadingFinishedHandler implements CdpEventHandler<'Network.loadingFinished'> {
    readonly event = 'Network.loadingFinished';

    private readonly _timelineStore: TimelineStore;
    private readonly _bodyReader: ResponseBodyReader;

    constructor(timelineStore: TimelineStore, bodyReader: ResponseBodyReader) {
        this._timelineStore = timelineStore;
        this._bodyReader = bodyReader;
    }

    async handleAsync(tabId: number, event: Protocol.Network.LoadingFinishedEvent): Promise<void> {
        const record = this._timelineStore.get(tabId, event.requestId);
        if (record == null) {
            return;
        }

        const captured = await this._bodyReader.readAsync({
            tabId,
            requestId: event.requestId,
            mimeType: record.summary.mimeType,
        });

        this._timelineStore.update({
            tabId,
            entryId: event.requestId,
            change: current => ({
                ...current,
                responseBody: captured.body,
                responseBodyNote: captured.note,
                summary: {
                    ...current.summary,
                    state: TIMELINE_ENTRY_STATE.Completed,
                    durationInMilliseconds: Durations.betweenTimestamps(
                        /* startedTimestamp: */ current.startedTimestamp,
                        /* endedTimestamp: */ event.timestamp,
                    ),
                },
            }),
        });
    }
}
