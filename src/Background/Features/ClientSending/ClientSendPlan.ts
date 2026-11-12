import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";

export const MarkerHeaderName = "x-rewire-send";

const PlaceholderBody = "-";
const BodyMethod = "POST";
const BodylessMethod = "GET";
const ReplacedBrowserHeaders = [
    MarkerHeaderName,
    "content-type",
    "content-length",
    "origin",
];

function lowerNamesOf(headers: HeaderEntry[]): Set<string> {
    return new Set(headers.map(header => header.name.toLowerCase()));
}

export const ClientSendPlan = {
    scriptOf(
        url: string,
        sendId: string,
        hasBody: boolean
    ): string {
        const init = {
            method: hasBody ? BodyMethod : BodylessMethod,
            headers: {
                [MarkerHeaderName]: sendId,
            },
            credentials: "omit",
            cache: "no-store",
            ...(hasBody
                ? {
                    body: PlaceholderBody,
                }
                : {}),
        };

        return [
            "(async () => {",
            "const startedAt = performance.now();",
            "try {",
            `const response = await fetch(${JSON.stringify(url)}, ${JSON.stringify(init)});`,
            "const body = await response.text();",
            "return { status: response.status, statusText: response.statusText, headers: [...response.headers].map(([name, value]) => ({ name, value })), body, durationInMilliseconds: Math.round(performance.now() - startedAt) };",
            "} catch (error) {",
            "return { error: String(error && error.message ? error.message : error) };",
            "}",
            "})()",
        ].join("\n");
    },

    markerOf(headers: Record<string, string>): string | null {
        const entry = Object
            .entries(headers)
            .find(([name]) => name.toLowerCase() === MarkerHeaderName);

        return entry?.[1] ?? null;
    },

    withoutMarker(headers: Record<string, string>): HeaderEntry[] {
        return Object
            .entries(headers)
            .filter(([name]) => name.toLowerCase() !== MarkerHeaderName)
            .map(([name, value]) => ({
                name,
                value,
            }));
    },

    mergedHeaders(browserHeaders: Record<string, string>, requested: HeaderEntry[]): HeaderEntry[] {
        const sent = requested.filter(header => header.name.trim() !== "");
        const sentNames = lowerNamesOf(sent);
        const kept = Object
            .entries(browserHeaders)
            .filter(([name]) => !ReplacedBrowserHeaders.includes(name.toLowerCase()) && !sentNames.has(name.toLowerCase()))
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
