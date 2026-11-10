import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import { Base64Text } from "../../Encoding/Base64Text";
import { type CookiePair, CookieHeader } from "../../Rules/Http/CookieHeader";
import { type SnippetBody, SnippetBodies } from "../SnippetBody";
import { SnippetHeaderNames } from "../SnippetHeaders";
import type { SnippetRequest } from "../SnippetRequest";
import { RequestLines } from "./RequestLines";

interface WgetState {
    method: string | null;
    url: string | null;
    headers: HeaderEntry[];
    cookies: CookiePair[];
    body: SnippetBody;
    isPost: boolean;
    user: string | null;
    password: string;
}

type ValueHandler = (state: WgetState, value: string) => void;

const LongPrefix = "--";
const ShortPrefix = "-";
const InlineValueSeparator = "=";
const HeaderSeparator = ":";
const UserSeparator = ":";
const BasicScheme = "Basic";
const PostMethod = "POST";
const GetMethod = "GET";

const HeaderNamesForOptions = {
    UserAgent: "User-Agent",
    Referer: "Referer",
    Authorization: "Authorization",
} as const;

function addHeader(state: WgetState, raw: string): void {
    const separator = raw.indexOf(HeaderSeparator);
    if (separator <= 0) {
        return;
    }

    const name = raw.slice(0, separator).trim();
    const value = raw.slice(separator + 1).trim();
    if (name.toLowerCase() === SnippetHeaderNames.Cookie) {
        state.cookies.push(...CookieHeader.parse(value));

        return;
    }

    state.headers.push({
        name,
        value,
    });
}

const ValueHandlers: Record<string, ValueHandler> = {
    "method": (state, value) => {
        state.method = value.toUpperCase();
    },
    "header": addHeader,
    "post-data": (state, value) => {
        state.body = SnippetBodies.text(value);
        state.isPost = true;
    },
    "post-file": (state, value) => {
        state.body = SnippetBodies.file(value);
        state.isPost = true;
    },
    "body-data": (state, value) => {
        state.body = SnippetBodies.text(value);
    },
    "body-file": (state, value) => {
        state.body = SnippetBodies.file(value);
    },
    "user-agent": (state, value) => addHeader(state, `${HeaderNamesForOptions.UserAgent}: ${value}`),
    "referer": (state, value) => addHeader(state, `${HeaderNamesForOptions.Referer}: ${value}`),
    "user": (state, value) => {
        state.user = value;
    },
    "http-user": (state, value) => {
        state.user = value;
    },
    "password": (state, value) => {
        state.password = value;
    },
    "http-password": (state, value) => {
        state.password = value;
    },
};

const IgnoredValueOptions = [
    "output-document",
    "output-file",
    "append-output",
    "execute",
    "timeout",
    "dns-timeout",
    "connect-timeout",
    "read-timeout",
    "tries",
    "wait",
    "waitretry",
    "load-cookies",
    "save-cookies",
    "directory-prefix",
    "max-redirect",
    "ca-certificate",
    "ca-directory",
    "certificate",
    "certificate-type",
    "private-key",
    "private-key-type",
    "quota",
    "limit-rate",
    "input-file",
    "base",
    "level",
    "local-encoding",
    "remote-encoding",
    "bind-address",
    "proxy-user",
    "proxy-password",
    "secure-protocol",
];

const ShortOptions: Record<string, string> = {
    "O": "output-document",
    "o": "output-file",
    "a": "append-output",
    "e": "execute",
    "T": "timeout",
    "t": "tries",
    "w": "wait",
    "U": "user-agent",
    "P": "directory-prefix",
    "Q": "quota",
    "i": "input-file",
    "B": "base",
    "l": "level",
};

function takesValue(option: string): boolean {
    return ValueHandlers[option] !== undefined || IgnoredValueOptions.includes(option);
}

function apply(
    state: WgetState,
    option: string,
    value: string
): void {
    ValueHandlers[option]?.(state, value);
}

function readArguments(state: WgetState, args: string[]): void {
    for (let index = 0; index < args.length; index++) {
        const argument = args[index]!;
        if (argument.startsWith(LongPrefix) && argument.length > LongPrefix.length) {
            const separator = argument.indexOf(InlineValueSeparator);
            const option = (separator === -1 ? argument : argument.slice(0, separator)).slice(LongPrefix.length);
            if (!takesValue(option)) {
                continue;
            }

            const value = separator === -1 ? args[++index] : argument.slice(separator + 1);
            if (value !== undefined) {
                apply(
                    state,
                    option,
                    value
                );
            }

            continue;
        }

        if (argument.startsWith(ShortPrefix) && argument.length > ShortPrefix.length) {
            const option = ShortOptions[argument.charAt(ShortPrefix.length)];
            if (option === undefined) {
                continue;
            }

            const attached = argument.slice(ShortPrefix.length + 1);
            const value = attached === "" ? args[++index] : attached;
            if (value !== undefined) {
                apply(
                    state,
                    option,
                    value
                );
            }

            continue;
        }

        state.url ??= argument;
    }
}

function methodOf(state: WgetState): string {
    if (state.method !== null) {
        return state.method;
    }

    return state.isPost || SnippetBodies.hasBody(state.body) ? PostMethod : GetMethod;
}

function headersOf(state: WgetState): HeaderEntry[] {
    if (state.user === null) {
        return state.headers;
    }

    return [
        ...state.headers,
        {
            name: HeaderNamesForOptions.Authorization,
            value: `${BasicScheme} ${Base64Text.fromUtf8(`${state.user}${UserSeparator}${state.password}`)}`,
        },
    ];
}

export const WgetOptionParser = {
    parse(args: string[]): SnippetRequest | null {
        const state: WgetState = {
            method: null,
            url: null,
            headers: [],
            cookies: [],
            body: SnippetBodies.none(),
            isPost: false,
            user: null,
            password: "",
        };
        readArguments(state, args);
        if (state.url === null) {
            return null;
        }

        return {
            method: methodOf(state),
            url: RequestLines.withScheme(state.url),
            headers: headersOf(state),
            cookies: state.cookies,
            body: state.body,
        };
    },
};
