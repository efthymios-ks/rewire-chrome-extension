type RawRecord = Record<string, unknown>;

export const RawRecords = {
    is(value: unknown): value is RawRecord {
        return typeof value === 'object'
            && value != null
            && !Array.isArray(value);
    },

    text(record: RawRecord, key: string): string {
        const value = record[key];

        return typeof value === 'string' ? value : '';
    },

    records(record: RawRecord, key: string): RawRecord[] {
        const value = record[key];

        return Array.isArray(value) ? value.filter(RawRecords.is) : [];
    },
};
