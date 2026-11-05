const MillisecondsPerSecond = 1000;

export const Durations = {
    betweenTimestamps(startedTimestamp: number, endedTimestamp: number): number {
        return Math.max(0, Math.round((endedTimestamp - startedTimestamp) * MillisecondsPerSecond));
    },
};
