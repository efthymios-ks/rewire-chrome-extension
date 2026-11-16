export const TIMELINE_LIMITS = Object.freeze({
    MaxEntriesPerTab: 500,
    MaxBodyLength: 1_048_576,
    MaxDecodedBodyBytes: 1_048_576,
    MaxPendingInterceptions: 200,
    MaxDeferredChanges: 200,
    MaxKeptTabs: 5,
} as const);
