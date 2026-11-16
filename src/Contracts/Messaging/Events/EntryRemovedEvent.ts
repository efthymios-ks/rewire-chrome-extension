import type { WORKER_EVENT_TYPE } from '../WorkerEventType';

export interface EntryRemovedEvent {
    type: typeof WORKER_EVENT_TYPE.EntryRemoved;
    tabId: number;
    entryId: string;
}
