import type { TimelineEntrySummary } from '../../Timeline/TimelineEntrySummary';
import type { WORKER_EVENT_TYPE } from '../WorkerEventType';

export interface EntryUpsertedEvent {
    type: typeof WORKER_EVENT_TYPE.EntryUpserted;
    entry: TimelineEntrySummary;
}
