const TwoDigits = 2;
const ThreeDigits = 3;
const Zero = "0";

function padded(value: number, digits: number): string {
    return String(value).padStart(digits, Zero);
}

function clockOf(date: Date): string {
    return [
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
    ]
        .map(part => padded(part, TwoDigits))
        .join(":");
}

export const ClockText = {
    of(iso: string): string {
        const date = new Date(iso);

        return Number.isNaN(date.getTime()) ? "" : clockOf(date);
    },

    precise(iso: string): string {
        const date = new Date(iso);

        return Number.isNaN(date.getTime()) ? "" : `${clockOf(date)}.${padded(date.getUTCMilliseconds(), ThreeDigits)}`;
    },
};
