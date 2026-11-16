const TWO_DIGITS = 2;
const THREE_DIGITS = 3;
const ZERO = '0';

function padded(value: number, digits: number): string {
    return String(value).padStart(digits, ZERO);
}

function clockOf(date: Date): string {
    return [
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
    ]
        .map(part => padded(part, TWO_DIGITS))
        .join(':');
}

export const ClockText = {
    of(iso: string): string {
        const date = new Date(iso);

        return Number.isNaN(date.getTime()) ? '' : clockOf(date);
    },

    precise(iso: string): string {
        const date = new Date(iso);

        return Number.isNaN(date.getTime())
            ? ''
            : `${clockOf(date)}.${padded(
                /* value: */ date.getUTCMilliseconds(),
                /* digits: */ THREE_DIGITS,
            )}`;
    },
};
