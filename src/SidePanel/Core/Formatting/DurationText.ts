const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_DECIMALS = 2;
const PENDING_TEXT = '...';

export const DurationText = {
    of(milliseconds: number | null): string {
        if (milliseconds == null) {
            return PENDING_TEXT;
        }

        if (milliseconds < MILLISECONDS_PER_SECOND) {
            return `${milliseconds} ms`;
        }

        return `${(milliseconds / MILLISECONDS_PER_SECOND).toFixed(SECONDS_DECIMALS)} s`;
    },
};
