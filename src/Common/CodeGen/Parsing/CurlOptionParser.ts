import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import { Base64Text } from "../../Encoding/Base64Text";
import { type CookiePair, CookieHeader } from "../../Rules/Http/CookieHeader";
import { type MultipartPart, type SnippetBody, SnippetBodies } from "../SnippetBody";
import { SnippetHeaderNames, SnippetHeaders } from "../SnippetHeaders";
import type { SnippetRequest } from "../SnippetRequest";
import { RequestLines } from "./RequestLines";

interface CurlState {
    method: string | null;
    url: string | null;
    headers: HeaderEntry[];
    cookies: CookiePair[];
    data: string[];
    parts: MultipartPart[];
    uploadFile: string | null;
    dataFile: string | null;
    standardInput: string | null;
    isGet: boolean;
    isHead: boolean;
    isJson: boolean;
}

type ValueHandler = (state: CurlState, value: string) => void;
type FlagHandler = (state: CurlState) => void;

const LongPrefix = "--";
const ShortPrefix = "-";
const InlineValueSeparator = "=";
const FilePrefix = "@";
const FileTextPrefix = "<";
const StandardInputName = "-";
const FormValueSeparator = "=";
const FormParameterSeparator = ";";
const TypeParameter = "type=";
const FileNameParameter = "filename=";
const RefererAutoSuffix = ";auto";
const DataSeparator = "&";
const QuerySeparator = "?";
const UserSeparator = ":";
const BasicScheme = "Basic";
const BearerScheme = "Bearer";
const JsonMediaType = "application/json";
const FormMediaType = "application/x-www-form-urlencoded";
const HeaderSeparator = ":";
const EmptyHeaderSuffix = ";";

const Methods = {
    Get: "GET",
    Head: "HEAD",
    Post: "POST",
    Put: "PUT",
} as const;

const HeaderNamesForOptions = {
    UserAgent: "User-Agent",
    Referer: "Referer",
    Authorization: "Authorization",
    ContentType: "Content-Type",
    Accept: "Accept",
} as const;

function addHeader(state: CurlState, raw: string): void {
    if (raw.startsWith(FilePrefix)) {
        return;
    }

    const separator = raw.indexOf(HeaderSeparator);
    const isEmptyValue = separator === -1 && raw.endsWith(EmptyHeaderSuffix);
    if (separator === -1 && !isEmptyValue) {
        return;
    }

    const name = (isEmptyValue ? raw.slice(0, -EmptyHeaderSuffix.length) : raw.slice(0, separator)).trim();
    const value = isEmptyValue ? "" : raw.slice(separator + 1).trim();
    if (name === "" || (value === "" && !isEmptyValue)) {
        return;
    }

    if (name.toLowerCase() === SnippetHeaderNames.Cookie) {
        state.cookies.push(...CookieHeader.parse(value));

        return;
    }

    state.headers.push({
        name,
        value,
    });
}

function addData(state: CurlState, value: string): void {
    if (!value.startsWith(FilePrefix)) {
        state.data.push(value);

        return;
    }

    const fileName = value.slice(FilePrefix.length);
    if (fileName === StandardInputName && state.standardInput !== null) {
        state.data.push(state.standardInput);

        return;
    }

    state.dataFile = fileName;
}

function urlEncodedPiece(value: string): string {
    const equals = value.indexOf(FormValueSeparator);
    const at = value.indexOf(FilePrefix);
    if (equals !== -1 && (at === -1 || equals < at)) {
        const name = value.slice(0, equals);
        const content = encodeURIComponent(value.slice(equals + 1));

        return name === "" ? content : `${name}${FormValueSeparator}${content}`;
    }

    if (at !== -1) {
        return at === 0 ? "" : `${value.slice(0, at)}${FormValueSeparator}`;
    }

    return encodeURIComponent(value);
}

function parameterOf(parameters: string[], prefix: string): string {
    const found = parameters.find(parameter => parameter.toLowerCase().startsWith(prefix));

    return found === undefined ? "" : RequestLines.unquote(found.slice(prefix.length));
}

function addFormPart(
    state: CurlState,
    raw: string,
    allowsFiles: boolean
): void {
    const separator = raw.indexOf(FormValueSeparator);
    if (separator <= 0) {
        return;
    }

    const name = raw.slice(0, separator);
    const rest = raw.slice(separator + 1);
    const isFile = allowsFiles && (rest.startsWith(FilePrefix) || rest.startsWith(FileTextPrefix));
    if (!isFile) {
        const typeIndex = allowsFiles ? rest.indexOf(`${FormParameterSeparator}${TypeParameter}`) : -1;
        state.parts.push(SnippetBodies.textPart(name, typeIndex === -1 ? rest : rest.slice(0, typeIndex)));

        return;
    }

    const [path = "", ...parameters] = rest
        .slice(FilePrefix.length)
        .split(FormParameterSeparator);
    const fileName = parameterOf(parameters, FileNameParameter) || path;
    state.parts.push(SnippetBodies.filePart(
        name,
        fileName,
        parameterOf(parameters, TypeParameter)
    ));
}

function addAuthorization(
    state: CurlState,
    scheme: string,
    credentials: string
): void {
    state.headers.push({
        name: HeaderNamesForOptions.Authorization,
        value: `${scheme} ${credentials}`,
    });
}

const ValueHandlers: Record<string, ValueHandler> = {
    "request": (state, value) => {
        state.method = value.toUpperCase();
    },
    "header": addHeader,
    "data": addData,
    "data-ascii": addData,
    "data-binary": addData,
    "data-raw": (state, value) => {
        state.data.push(value);
    },
    "data-urlencode": (state, value) => {
        state.data.push(urlEncodedPiece(value));
    },
    "json": (state, value) => {
        addData(state, value);
        state.isJson = true;
    },
    "form": (state, value) => addFormPart(
        state,
        value,
        true
    ),
    "form-string": (state, value) => addFormPart(
        state,
        value,
        false
    ),
    "cookie": (state, value) => {
        if (value.includes(FormValueSeparator)) {
            state.cookies.push(...CookieHeader.parse(value));
        }
    },
    "user-agent": (state, value) => addHeader(state, `${HeaderNamesForOptions.UserAgent}: ${value}`),
    "referer": (state, value) => addHeader(state, `${HeaderNamesForOptions.Referer}: ${value.replace(RefererAutoSuffix, "")}`),
    "user": (state, value) => addAuthorization(
        state,
        BasicScheme,
        Base64Text.fromUtf8(value.includes(UserSeparator) ? value : `${value}${UserSeparator}`)
    ),
    "oauth2-bearer": (state, value) => addAuthorization(
        state,
        BearerScheme,
        value
    ),
    "upload-file": (state, value) => {
        state.uploadFile = value;
    },
    "url": (state, value) => {
        state.url ??= value;
    },
};

const FlagHandlers: Record<string, FlagHandler> = {
    "get": state => {
        state.isGet = true;
    },
    "head": state => {
        state.isHead = true;
    },
};

const IgnoredValueOptions = [
    "output",
    "max-time",
    "connect-timeout",
    "proxy",
    "proxy-user",
    "proxy-header",
    "write-out",
    "cookie-jar",
    "dump-header",
    "cert",
    "cert-type",
    "key",
    "key-type",
    "pass",
    "cacert",
    "capath",
    "ciphers",
    "retry",
    "retry-delay",
    "retry-max-time",
    "max-redirs",
    "max-filesize",
    "resolve",
    "connect-to",
    "limit-rate",
    "range",
    "aws-sigv4",
    "interface",
    "local-port",
    "keepalive-time",
    "config",
    "tls-max",
    "unix-socket",
    "abstract-unix-socket",
    "proto",
    "proto-redir",
    "request-target",
    "variable",
    "expect100-timeout",
    "dns-servers",
    "doh-url",
    "noproxy",
    "socks5",
    "socks5-hostname",
    "preproxy",
    "trace",
    "trace-ascii",
    "stderr",
    "output-dir",
    "time-cond",
    "quote",
    "continue-at",
    "ftp-port",
    "netrc-file",
    "url-query",
    "hsts",
    "alt-svc",
    "etag-compare",
    "etag-save",
    "speed-limit",
    "speed-time",
    "telnet-option",
];

const ShortOptions: Record<string, string> = {
    "X": "request",
    "H": "header",
    "d": "data",
    "F": "form",
    "b": "cookie",
    "A": "user-agent",
    "e": "referer",
    "u": "user",
    "T": "upload-file",
    "G": "get",
    "I": "head",
    "o": "output",
    "m": "max-time",
    "x": "proxy",
    "U": "proxy-user",
    "w": "write-out",
    "c": "cookie-jar",
    "D": "dump-header",
    "E": "cert",
    "K": "config",
    "r": "range",
    "Y": "speed-limit",
    "y": "speed-time",
    "z": "time-cond",
    "C": "continue-at",
    "P": "ftp-port",
    "Q": "quote",
    "t": "telnet-option",
};

function takesValue(option: string): boolean {
    return ValueHandlers[option] !== undefined || IgnoredValueOptions.includes(option);
}

function apply(
    state: CurlState,
    option: string,
    value: string
): void {
    ValueHandlers[option]?.(state, value);
}

function newState(standardInput: string | null): CurlState {
    return {
        method: null,
        url: null,
        headers: [],
        cookies: [],
        data: [],
        parts: [],
        uploadFile: null,
        dataFile: null,
        standardInput,
        isGet: false,
        isHead: false,
        isJson: false,
    };
}

function readArguments(state: CurlState, args: string[]): void {
    for (let index = 0; index < args.length; index++) {
        const argument = args[index]!;
        if (argument.startsWith(LongPrefix) && argument.length > LongPrefix.length) {
            const separator = argument.indexOf(InlineValueSeparator);
            const named = separator === -1 ? argument : argument.slice(0, separator);
            const option = named.slice(LongPrefix.length);
            if (!takesValue(option)) {
                FlagHandlers[option]?.(state);
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
            for (let position = ShortPrefix.length; position < argument.length; position++) {
                const option = ShortOptions[argument.charAt(position)];
                if (option === undefined) {
                    continue;
                }

                if (!takesValue(option)) {
                    FlagHandlers[option]?.(state);
                    continue;
                }

                const attached = argument.slice(position + 1);
                const value = attached === "" ? args[++index] : attached;
                if (value !== undefined) {
                    apply(
                        state,
                        option,
                        value
                    );
                }

                break;
            }

            continue;
        }

        state.url ??= argument;
    }
}

function bodyOf(state: CurlState): SnippetBody {
    if (state.parts.length > 0) {
        return SnippetBodies.multipart(state.parts);
    }

    const fileName = state.uploadFile ?? state.dataFile;
    if (fileName !== null) {
        return SnippetBodies.file(fileName);
    }

    return state.isGet ? SnippetBodies.none() : SnippetBodies.text(state.data.join(DataSeparator));
}

function methodOf(state: CurlState, body: SnippetBody): string {
    if (state.method !== null) {
        return state.method;
    }

    if (state.isHead) {
        return Methods.Head;
    }

    if (state.isGet) {
        return Methods.Get;
    }

    if (state.uploadFile !== null) {
        return Methods.Put;
    }

    return SnippetBodies.hasBody(body) ? Methods.Post : Methods.Get;
}

function withDefaultHeaders(state: CurlState, body: SnippetBody): HeaderEntry[] {
    if (!SnippetBodies.hasBody(body) || state.parts.length > 0 || state.uploadFile !== null || state.dataFile !== null) {
        return state.headers;
    }

    const defaults = state.isJson
        ? [
            {
                name: HeaderNamesForOptions.ContentType,
                value: JsonMediaType,
            },
            {
                name: HeaderNamesForOptions.Accept,
                value: JsonMediaType,
            },
        ]
        : [
            {
                name: HeaderNamesForOptions.ContentType,
                value: FormMediaType,
            },
        ];

    return [
        ...state.headers,
        ...defaults.filter(header => SnippetHeaders.find(state.headers, header.name.toLowerCase()) === undefined),
    ];
}

function urlOf(state: CurlState): string {
    const url = RequestLines.withScheme(state.url!);
    if (!state.isGet || state.data.length === 0) {
        return url;
    }

    const separator = url.includes(QuerySeparator) ? DataSeparator : QuerySeparator;

    return `${url}${separator}${state.data.join(DataSeparator)}`;
}

export const CurlOptionParser = {
    parse(args: string[], standardInput: string | null): SnippetRequest | null {
        const state = newState(standardInput);
        readArguments(state, args);
        if (state.url === null) {
            return null;
        }

        const body = bodyOf(state);

        return {
            method: methodOf(state, body),
            url: urlOf(state),
            headers: withDefaultHeaders(state, body),
            cookies: state.cookies,
            body,
        };
    },
};
