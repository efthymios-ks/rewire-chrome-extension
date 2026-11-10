import type { HeaderEntry } from "../../Contracts/Timeline/HeaderEntry";

const PseudoHeaderPrefix = ":";
const AlwaysSkippedHeaders = [
    "content-length",
    "host",
    "connection",
    "keep-alive",
    "proxy-connection",
    "transfer-encoding",
    "expect",
    "te",
    "upgrade",
];

export const SnippetHeaderNames = {
    Cookie: "cookie",
    ContentType: "content-type",
    AcceptEncoding: "accept-encoding",
    UserAgent: "user-agent",
    Referer: "referer",
    Authorization: "authorization",
    Accept: "accept",
} as const;

export const SnippetHeaders = {
    isNamed(header: HeaderEntry, name: string): boolean {
        return header.name.toLowerCase() === name;
    },

    sendable(headers: HeaderEntry[]): HeaderEntry[] {
        return headers.filter(header => {
            const name = header.name.toLowerCase();

            return !name.startsWith(PseudoHeaderPrefix) && !AlwaysSkippedHeaders.includes(name);
        });
    },

    find(headers: HeaderEntry[], name: string): HeaderEntry | undefined {
        return headers.find(header => SnippetHeaders.isNamed(header, name));
    },

    without(headers: HeaderEntry[], names: string[]): HeaderEntry[] {
        return headers.filter(header => !names.includes(header.name.toLowerCase()));
    },

    merged(headers: HeaderEntry[]): HeaderEntry[] {
        const merged: HeaderEntry[] = [];
        headers.forEach(header => {
            const existing = SnippetHeaders.find(merged, header.name.toLowerCase());
            if (existing === undefined) {
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
