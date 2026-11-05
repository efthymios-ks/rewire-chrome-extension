import type { HeaderEntry } from "../../Contracts/Timeline/HeaderEntry";
import { FetchCall } from "./FetchCall";
import type { ISnippetGenerator, RequestSnapshot, SnippetOptions } from "./RequestSnapshot";
import { type SnippetParts as Parts, SnippetHeaderNames, SnippetParts } from "./SnippetParts";

const ForbiddenHeaders = [
    "accept-charset",
    "accept-encoding",
    "access-control-request-headers",
    "access-control-request-method",
    "cookie2",
    "date",
    "dnt",
    "origin",
    "referer",
    "set-cookie",
    "trailer",
    "user-agent",
    "via",
];
const ForbiddenPrefixes = [
    "proxy-",
    "sec-",
];
const Credentials = {
    Include: "include",
    Omit: "omit",
} as const;

function isAllowed(header: HeaderEntry): boolean {
    const name = header.name.toLowerCase();

    return !ForbiddenHeaders.includes(name) && !ForbiddenPrefixes.some(prefix => name.startsWith(prefix));
}

function browserOptions(parts: Parts): Array<[string, string]> {
    const extra: Array<[string, string]> = [];
    const referer = SnippetParts.find(parts.headers, SnippetHeaderNames.Referer);
    if (referer !== undefined) {
        extra.push([
            "referrer",
            JSON.stringify(referer.value),
        ]);
    }

    extra.push([
        "credentials",
        JSON.stringify(parts.cookie === null ? Credentials.Omit : Credentials.Include),
    ]);

    return extra;
}

export class FetchSnippet implements ISnippetGenerator {
    readonly id = "fetch";
    readonly label = "Fetch (browser)";

    generate(snapshot: RequestSnapshot, options: SnippetOptions): string {
        return FetchCall.build(
            snapshot,
            options,
            {
                headersOf: parts => parts.headers.filter(isAllowed),
                extraOptions: browserOptions,
            }
        );
    }
}
