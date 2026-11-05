import type { HeaderEntry } from "../../Contracts/Timeline/HeaderEntry";

const RawValueSeparator = "\n";

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
                .split(RawValueSeparator)
                .map(value => ({
                    name: header.name,
                    value,
                })));
    },

    fromRecord(record: Record<string, string> | undefined): HeaderEntry[] {
        if (record === undefined) {
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
