import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";

function isNamed(entry: HeaderEntry, name: string): boolean {
    return entry.name.toLowerCase() === name.toLowerCase();
}

export const HeaderList = {
    values(headers: HeaderEntry[], name: string): string[] {
        return headers
            .filter(entry => isNamed(entry, name))
            .map(entry => entry.value);
    },

    first(headers: HeaderEntry[], name: string): string | null {
        return headers.find(entry => isNamed(entry, name))?.value ?? null;
    },

    set(
        headers: HeaderEntry[],
        name: string,
        value: string
    ): HeaderEntry[] {
        return [
            ...HeaderList.remove(headers, name),
            {
                name,
                value,
            },
        ];
    },

    append(
        headers: HeaderEntry[],
        name: string,
        value: string
    ): HeaderEntry[] {
        return [
            ...headers,
            {
                name,
                value,
            },
        ];
    },

    remove(headers: HeaderEntry[], name: string): HeaderEntry[] {
        return headers.filter(entry => !isNamed(entry, name));
    },
};
