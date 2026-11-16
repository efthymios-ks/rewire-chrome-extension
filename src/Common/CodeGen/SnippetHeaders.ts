import { HEADER_NAMES } from '../../Contracts/Http/HeaderNames';
import type { HeaderEntry } from '../../Contracts/Timeline/HeaderEntry';

const PSEUDO_HEADER_PREFIX = ':';
const TRANSPORT_HEADERS = [
    HEADER_NAMES.ContentLength,
    HEADER_NAMES.Host,
    HEADER_NAMES.Connection,
    HEADER_NAMES.KeepAlive,
    HEADER_NAMES.ProxyConnection,
    HEADER_NAMES.TransferEncoding,
    HEADER_NAMES.Expect,
    HEADER_NAMES.TE,
    HEADER_NAMES.Upgrade,
];

export const SnippetHeaders = {
    isNamed(header: HeaderEntry, name: string): boolean {
        return header.name.toLowerCase() === name.toLowerCase();
    },

    sendable(headers: HeaderEntry[]): HeaderEntry[] {
        return SnippetHeaders
            .without(headers, TRANSPORT_HEADERS)
            .filter(header => !header.name.startsWith(PSEUDO_HEADER_PREFIX));
    },

    // Bodies are kept decoded, so a generated snippet must not claim an encoding; tools recompute the length.
    forSnippet(headers: HeaderEntry[]): HeaderEntry[] {
        return SnippetHeaders.without(SnippetHeaders.sendable(headers), [HEADER_NAMES.ContentEncoding]);
    },

    find(headers: HeaderEntry[], name: string): HeaderEntry | undefined {
        return headers.find(header => SnippetHeaders.isNamed(header, name));
    },

    without(headers: HeaderEntry[], names: string[]): HeaderEntry[] {
        const lowerNames = names.map(name => name.toLowerCase());

        return headers.filter(header => !lowerNames.includes(header.name.toLowerCase()));
    },

    merged(headers: HeaderEntry[]): HeaderEntry[] {
        const merged: HeaderEntry[] = [];
        headers.forEach(header => {
            const existing = SnippetHeaders.find(merged, header.name);
            if (existing == null) {
                merged.push({
                    ...header,
                });

                return;
            }

            existing.value = `${existing.value}, ${header.value}`;
        });

        return merged;
    },
};
