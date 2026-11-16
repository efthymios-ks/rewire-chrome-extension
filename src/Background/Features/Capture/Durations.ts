const MILLISECONDS_PER_SECOND = 1000;

export const Durations = {
    betweenTimestamps(startedTimestamp: number, endedTimestamp: number): number {
        return Math.max(
            /* values: */ 0,
            /* values: */ Math.round((endedTimestamp - startedTimestamp) * MILLISECONDS_PER_SECOND),
        );
    },
};
