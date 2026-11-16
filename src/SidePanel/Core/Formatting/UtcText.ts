const DATE_TIME_LENGTH = 19;
const UTC_DESIGNATOR = 'Z';

export const UtcText = {
    of(date: Date): string {
        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return `${date.toISOString().slice(0, DATE_TIME_LENGTH)}${UTC_DESIGNATOR}`;
    },

    ofText(text: string): string {
        const formatted = UtcText.of(new Date(text));

        return formatted === '' ? text : formatted;
    },
};
