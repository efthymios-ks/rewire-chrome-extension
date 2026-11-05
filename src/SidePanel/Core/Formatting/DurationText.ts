const MillisecondsPerSecond = 1000;
const SecondsDecimals = 2;
const PendingText = "...";

export const DurationText = {
    of(milliseconds: number | null): string {
        if (milliseconds === null) {
            return PendingText;
        }

        if (milliseconds < MillisecondsPerSecond) {
            return `${milliseconds} ms`;
        }

        return `${(milliseconds / MillisecondsPerSecond).toFixed(SecondsDecimals)} s`;
    },
};
