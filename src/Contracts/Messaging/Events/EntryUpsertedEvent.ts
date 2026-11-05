import type { TimelineEntrySummary } from "../../Timeline/TimelineEntrySummary";
import type { WorkerEventType } from "../WorkerEventType";

export interface EntryUpsertedEvent {
    type: WorkerEventType.EntryUpserted;
    entry: TimelineEntrySummary;
}
