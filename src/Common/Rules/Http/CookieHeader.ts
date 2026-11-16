import type { CookiePair } from './CookiePair';

const PAIR_SEPARATOR = ';';
const VALUE_SEPARATOR = '=';

export interface SetOptions {
    header: string | null;
    name: string;
    value: string;
}

export interface AppendOptions {
    header: string | null;
    name: string;
    value: string;
}

export const CookieHeader = {
    parse(header: string | null): CookiePair[] {
        if (header == null || header.trim() === '') {
            return [];
        }

        return header
            .split(PAIR_SEPARATOR)
            .map(part => part.trim())
            .filter(part => part.length > 0)
            .map(part => {
                const separatorIndex = part.indexOf(VALUE_SEPARATOR);
                if (separatorIndex === -1) {
                    return {
                        name: part,
                        value: '',
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
            .map(pair => `${pair.name}${VALUE_SEPARATOR}${pair.value}`)
            .join(`${PAIR_SEPARATOR} `);
    },

    valuesOf(header: string | null, name: string): string[] {
        return CookieHeader
            .parse(header)
            .filter(pair => pair.name === name)
            .map(pair => pair.value);
    },

    set({ header, name, value }: SetOptions): string {
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

    append({ header, name, value }: AppendOptions): string {
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
