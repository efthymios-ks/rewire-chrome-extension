const DateTimeLength = 19;
const UtcDesignator = "Z";

export const UtcText = {
    of(date: Date): string {
        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return `${date.toISOString().slice(0, DateTimeLength)}${UtcDesignator}`;
    },

    ofText(text: string): string {
        const formatted = UtcText.of(new Date(text));

        return formatted === "" ? text : formatted;
    },
};
