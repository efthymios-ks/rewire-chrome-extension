import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';

function isNamed(entry: HeaderEntry, name: string): boolean {
    return entry.name.toLowerCase() === name.toLowerCase();
}

export interface SetOptions {
    headers: HeaderEntry[];
    name: string;
    value: string;
}

export interface AppendOptions {
    headers: HeaderEntry[];
    name: string;
    value: string;
}

export const HeaderList = {
    values(headers: HeaderEntry[], name: string): string[] {
        return headers
            .filter(entry => isNamed(entry, name))
            .map(entry => entry.value);
    },

    set({ headers, name, value }: SetOptions): HeaderEntry[] {
        return [
            ...HeaderList.remove(headers, name),
            {
                name,
                value,
            },
        ];
    },

    append({ headers, name, value }: AppendOptions): HeaderEntry[] {
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
