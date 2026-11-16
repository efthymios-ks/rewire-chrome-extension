import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import { MARKER_HEADER_NAME } from './MarkerHeaderName';

const PLACEHOLDER_BODY = '-';
const BODY_METHOD = 'POST';
const BODYLESS_METHOD = 'GET';
const REPLACED_BROWSER_HEADERS = [
    MARKER_HEADER_NAME,
    'content-type',
    'content-length',
    'origin',
];

function lowerNamesOf(headers: HeaderEntry[]): Set<string> {
    return new Set(headers.map(header => header.name.toLowerCase()));
}

export interface ScriptOfOptions {
    url: string;
    sendId: string;
    hasBody: boolean;
}

export const ClientSendPlan = {
    scriptOf({ url, sendId, hasBody }: ScriptOfOptions): string {
        const init = {
            method: hasBody ? BODY_METHOD : BODYLESS_METHOD,
            headers: {
                [MARKER_HEADER_NAME]: sendId,
            },
            credentials: 'omit',
            cache: 'no-store',
            ...(hasBody
                ? {
                    body: PLACEHOLDER_BODY,
                }
                : {}),
        };

        return [
            '(async () => {',
            'const startedAt = performance.now();',
            'try {',
            `const response = await fetch(${JSON.stringify(url)}, ${JSON.stringify(init)});`,
            'const body = await response.text();',
            'return { status: response.status, statusText: response.statusText, headers: [...response.headers].map(([name, value]) => ({ name, value })), body, durationInMilliseconds: Math.round(performance.now() - startedAt) };',
            '} catch (error) {',
            'return { error: String(error && error.message ? error.message : error) };',
            '}',
            '})()',
        ].join('\n');
    },

    markerOf(headers: Record<string, string>): string | null {
        const entry = Object
            .entries(headers)
            .find(([name]) => name.toLowerCase() === MARKER_HEADER_NAME);

        return entry?.[1] ?? null;
    },

    withoutMarker(headers: Record<string, string>): HeaderEntry[] {
        return Object
            .entries(headers)
            .filter(([name]) => name.toLowerCase() !== MARKER_HEADER_NAME)
            .map(([name, value]) => ({
                name,
                value,
            }));
    },

    mergedHeaders(browserHeaders: Record<string, string>, requested: HeaderEntry[]): HeaderEntry[] {
        const sent = requested.filter(header => header.name.trim() !== '');
        const sentNames = lowerNamesOf(sent);
        const kept = Object
            .entries(browserHeaders)
            .filter(([name]) => !REPLACED_BROWSER_HEADERS.includes(name.toLowerCase())
                && !sentNames.has(name.toLowerCase()))
            .map(([name, value]) => ({
                name,
                value,
            }));

        return [
            ...kept,
            ...sent,
        ];
    },
};
