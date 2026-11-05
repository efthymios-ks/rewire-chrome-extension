import type { HeaderEntry } from "../../Contracts/Timeline/HeaderEntry";
import { CookieHeader } from "../Rules/Http/CookieHeader";
import { QueryString } from "../Urls/QueryString";
import type { RequestSnapshot, SnippetOptions } from "./RequestSnapshot";

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
const BodylessMethods = [
    "GET",
    "HEAD",
];
const SingleQuote = "'";
const PowerShellQuotePattern = /['‘’‚‛]/g;
const CmdUnsafePattern = /[^a-zA-Z0-9\s_\-:=+~'/.,?;()*`]/g;
const CmdVariablePattern = /%(?=[a-zA-Z0-9_])/g;
const LineBreakPattern = /\r?\n/g;
const BackslashesBeforeQuotePattern = /(\\*)"/g;
const TrailingBackslashesPattern = /(\\+)$/;
const NonAsciiPattern = /[^\x00-\x7F]/;
const ControlCharacterPattern = /[\x00-\x08\x0B-\x1F\x7F]/;
const AnsiEscapedPattern = /[\\'\x00-\x1F\x7F]/g;
const HexRadix = 16;
const AnsiEscapes: Record<string, string> = {
    "\\": "\\\\",
    "'": "\\'",
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t",
};

export const SnippetHeaderNames = {
    Cookie: "cookie",
    ContentType: "content-type",
    AcceptEncoding: "accept-encoding",
    UserAgent: "user-agent",
    Referer: "referer",
} as const;

export interface SnippetParts {
    method: string;
    url: string;
    headers: HeaderEntry[];
    cookie: string | null;
    body: string | null;
}

function isNamed(header: HeaderEntry, name: string): boolean {
    return header.name.toLowerCase() === name;
}

function isSendable(header: HeaderEntry): boolean {
    const name = header.name.toLowerCase();

    return !name.startsWith(PseudoHeaderPrefix) && !AlwaysSkippedHeaders.includes(name);
}

export const SnippetParts = {
    of(snapshot: RequestSnapshot, options: SnippetOptions): SnippetParts {
        const body = options.includeBody && snapshot.body !== null && snapshot.body !== "" ? snapshot.body : null;
        const sendable = SnippetParts.sendable(snapshot.headers);
        const cookies = sendable
            .filter(header => isNamed(header, SnippetHeaderNames.Cookie))
            .flatMap(header => CookieHeader.parse(header.value))
            .filter(cookie => !options.excludedCookies.includes(cookie.name));
        const headers = sendable
            .filter(header => !isNamed(header, SnippetHeaderNames.Cookie))
            .filter(header => !options.excludedHeaders.includes(header.name.toLowerCase()));

        return {
            method: snapshot.method.toUpperCase(),
            url: QueryString.without(snapshot.url, options.excludedQueryParams),
            headers,
            cookie: cookies.length > 0 ? CookieHeader.serialize(cookies) : null,
            body,
        };
    },

    sendable(headers: HeaderEntry[]): HeaderEntry[] {
        return headers.filter(isSendable);
    },

    find(headers: HeaderEntry[], name: string): HeaderEntry | undefined {
        return headers.find(header => isNamed(header, name));
    },

    without(headers: HeaderEntry[], names: string[]): HeaderEntry[] {
        return headers.filter(header => !names.includes(header.name.toLowerCase()));
    },

    merged(headers: HeaderEntry[]): HeaderEntry[] {
        const merged: HeaderEntry[] = [];
        headers.forEach(header => {
            const existing = merged.find(candidate => isNamed(candidate, header.name.toLowerCase()));
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

    isBodyless(method: string): boolean {
        return BodylessMethods.includes(method);
    },

    posixQuote(value: string): string {
        if (ControlCharacterPattern.test(value)) {
            return `$'${value.replace(AnsiEscapedPattern, character => AnsiEscapes[character] ?? `\\x${character.charCodeAt(0).toString(HexRadix).padStart(2, "0")}`)}'`;
        }

        return `${SingleQuote}${value.replaceAll(SingleQuote, "'\\''")}${SingleQuote}`;
    },

    powerShellQuote(value: string): string {
        return `${SingleQuote}${value.replace(PowerShellQuotePattern, match => `${match}${match}`)}${SingleQuote}`;
    },

    hasNonAscii(text: string): boolean {
        return NonAsciiPattern.test(text);
    },

    cmdQuote(value: string): string {
        const escaped = value
            .replace(BackslashesBeforeQuotePattern, "$1$1\\\"")
            .replace(TrailingBackslashesPattern, "$1$1")
            .replace(CmdUnsafePattern, "^$&")
            .replace(CmdVariablePattern, "%^")
            .replace(LineBreakPattern, "^\n\n");

        return `^"${escaped}^"`;
    },
};
