export const TIMELINE_ENTRY_STATE = Object.freeze({
    Pending: 1,
    Completed: 2,
    Failed: 3,
} as const);

export type TimelineEntryState = (typeof TIMELINE_ENTRY_STATE)[keyof typeof TIMELINE_ENTRY_STATE];
