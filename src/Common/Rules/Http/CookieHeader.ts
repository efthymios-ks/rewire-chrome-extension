export interface CookiePair {
    name: string;
    value: string;
}

const PairSeparator = ";";
const ValueSeparator = "=";

export const CookieHeader = {
    parse(header: string | null): CookiePair[] {
        if (header === null || header.trim() === "") {
            return [];
        }

        return header
            .split(PairSeparator)
            .map(part => part.trim())
            .filter(part => part.length > 0)
            .map(part => {
                const separatorIndex = part.indexOf(ValueSeparator);
                if (separatorIndex === -1) {
                    return {
                        name: part,
                        value: "",
                    };
                }

                return {
                    name: part.slice(0, separatorIndex).trim(),
                    value: part.slice(separatorIndex + 1).trim(),
                };
            });
    },

    serialize(pairs: CookiePair[]): string {
        return pairs
            .map(pair => `${pair.name}${ValueSeparator}${pair.value}`)
            .join(`${PairSeparator} `);
    },

    valuesOf(header: string | null, name: string): string[] {
        return CookieHeader
            .parse(header)
            .filter(pair => pair.name === name)
            .map(pair => pair.value);
    },

    set(
        header: string | null,
        name: string,
        value: string
    ): string {
        const others = CookieHeader
            .parse(header)
            .filter(pair => pair.name !== name);

        return CookieHeader.serialize([
            ...others,
            {
                name,
                value,
            },
        ]);
    },

    append(
        header: string | null,
        name: string,
        value: string
    ): string {
        return CookieHeader.serialize([
            ...CookieHeader.parse(header),
            {
                name,
                value,
            },
        ]);
    },

    remove(header: string | null, name: string): string {
        return CookieHeader.serialize(CookieHeader
            .parse(header)
            .filter(pair => pair.name !== name));
    },
};
