import type { HeaderEntry } from '../../Contracts/Timeline/HeaderEntry';

const RAW_VALUE_SEPARATOR = '\n';

export const HeaderLookup = {
    find(headers: HeaderEntry[], name: string): string | null {
        const lowerName = name.toLowerCase();
        const header = headers.find(entry => entry.name.toLowerCase() === lowerName);

        return header?.value ?? null;
    },

    fromRawRecord(record: Record<string, string> | undefined): HeaderEntry[] {
        return HeaderLookup
            .fromRecord(record)
            .flatMap(header => header.value
                .split(RAW_VALUE_SEPARATOR)
                .map(value => ({
                    name: header.name,
                    value,
                })));
    },

    fromRecord(record: Record<string, string> | undefined): HeaderEntry[] {
        if (record == null) {
            return [];
        }

        return Object
            .entries(record)
            .map(([name, value]) => ({
                name,
                value,
            }));
    },
};
