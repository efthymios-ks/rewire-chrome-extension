export const WORKER_EVENT_TYPE = Object.freeze({
    CommandCompleted: 1,
    EntryUpserted: 2,
    TimelineCleared: 3,
    InspectionChanged: 4,
    ChannelUpserted: 5,
    LiveMessageAdded: 6,
    PostMessageAdded: 7,
    EntryRemoved: 8,
} as const);

export type WorkerEventType = (typeof WORKER_EVENT_TYPE)[keyof typeof WORKER_EVENT_TYPE];
