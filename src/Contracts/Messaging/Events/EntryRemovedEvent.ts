import type { WorkerEventType } from "../WorkerEventType";

export interface EntryRemovedEvent {
    type: WorkerEventType.EntryRemoved;
    tabId: number;
    entryId: string;
}
