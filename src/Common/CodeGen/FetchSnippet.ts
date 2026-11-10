import type { HeaderEntry } from "../../Contracts/Timeline/HeaderEntry";
import { FetchCall } from "./FetchCall";
import { DefaultSnippetParts, type RequestSnapshot, type SnippetOptions } from "./RequestSnapshot";
import { RequestSnippetBase } from "./RequestSnippetBase";
import { SnippetHeaderNames, SnippetHeaders } from "./SnippetHeaders";
import { type SnippetRequest, SnippetRequests } from "./SnippetRequest";

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
const PickedFileExpression = "document.querySelector(\"input[type=file]\").files[0]";

function isAllowed(header: HeaderEntry): boolean {
    const name = header.name.toLowerCase();

    return !ForbiddenHeaders.includes(name) && !ForbiddenPrefixes.some(prefix => name.startsWith(prefix));
}

function browserOptions(request: SnippetRequest): Array<[string, string]> {
    const extra: Array<[string, string]> = [];
    const referer = SnippetHeaders.find(request.headers, SnippetHeaderNames.Referer);
    if (referer !== undefined) {
        extra.push([
            "referrer",
            JSON.stringify(referer.value),
        ]);
    }

    extra.push([
        "credentials",
        JSON.stringify(SnippetRequests.cookieTextOf(request) === null ? Credentials.Omit : Credentials.Include),
    ]);

    return extra;
}

export class FetchSnippet extends RequestSnippetBase {
    static readonly id = "fetch";
    static readonly label = "Fetch (browser)";

    static tryParse(_text: string): FetchSnippet | null {
        return null;
    }

    static from(snapshot: RequestSnapshot, options: SnippetOptions = DefaultSnippetParts): FetchSnippet {
        return new FetchSnippet(SnippetRequests.of(snapshot, options));
    }

    override toString(): string {
        return FetchCall.render(this.request, {
            headersOf: request => request.headers.filter(isAllowed),
            extraOptions: browserOptions,
            fileExpression: () => PickedFileExpression,
            preamble: () => [],
        });
    }
}
