import { HEADER_NAMES } from '../../../Contracts/Http/HeaderNames';
import { HTTP_METHODS } from '../../../Contracts/Http/HttpMethods';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import { Base64Text } from '../../Encoding/Base64Text';
import { CookieHeader } from '../../Rules/Http/CookieHeader';
import type { CookiePair } from '../../Rules/Http/CookiePair';
import type { MultipartPart } from '../MultipartPart';
import { SnippetBodies } from '../SnippetBodies';
import type { SnippetBody } from '../SnippetBody';
import { SnippetHeaders } from '../SnippetHeaders';
import type { SnippetRequest } from '../SnippetRequest';
import { CommandOptions } from './CommandOptions';
import { RequestLines } from './RequestLines';

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

const SHORT_PREFIX = '-';
const FILE_PREFIX = '@';
const FILE_TEXT_PREFIX = '<';
const STANDARD_INPUT_NAME = '-';
const FORM_VALUE_SEPARATOR = '=';
const FORM_PARAMETER_SEPARATOR = ';';
const TYPE_PARAMETER = 'type=';
const FILE_NAME_PARAMETER = 'filename=';
const REFERER_AUTO_SUFFIX = ';auto';
const DATA_SEPARATOR = '&';
const QUERY_SEPARATOR = '?';
const USER_SEPARATOR = ':';
const BASIC_SCHEME = 'Basic';
const BEARER_SCHEME = 'Bearer';
const JSON_MEDIA_TYPE = 'application/json';
const FORM_MEDIA_TYPE = 'application/x-www-form-urlencoded';
const HEADER_SEPARATOR = ':';
const EMPTY_HEADER_SUFFIX = ';';

function addHeader(state: CurlState, raw: string): void {
    if (raw.startsWith(FILE_PREFIX)) {
        return;
    }

    const separator = raw.indexOf(HEADER_SEPARATOR);
    const isEmptyValue = separator === -1 && raw.endsWith(EMPTY_HEADER_SUFFIX);
    if (separator === -1 && !isEmptyValue) {
        return;
    }

    const name = (isEmptyValue ? raw.slice(0, -EMPTY_HEADER_SUFFIX.length) : raw.slice(0, separator)).trim();
    const value = isEmptyValue ? '' : raw.slice(separator + 1).trim();
    if (name === '' || (value === '' && !isEmptyValue)) {
        return;
    }

    if (name.toLowerCase() === HEADER_NAMES.Cookie.toLowerCase()) {
        state.cookies.push(...CookieHeader.parse(value));

        return;
    }

    state.headers.push({
        name,
        value,
    });
}

function addData(state: CurlState, value: string): void {
    if (!value.startsWith(FILE_PREFIX)) {
        state.data.push(value);

        return;
    }

    const fileName = value.slice(FILE_PREFIX.length);
    if (fileName === STANDARD_INPUT_NAME && state.standardInput != null) {
        state.data.push(state.standardInput);

        return;
    }

    state.dataFile = fileName;
}

function urlEncodedPiece(value: string): string {
    const equals = value.indexOf(FORM_VALUE_SEPARATOR);
    const at = value.indexOf(FILE_PREFIX);
    if (equals !== -1 && (at === -1 || equals < at)) {
        const name = value.slice(0, equals);
        const content = encodeURIComponent(value.slice(equals + 1));

        return name === '' ? content : `${name}${FORM_VALUE_SEPARATOR}${content}`;
    }

    if (at !== -1) {
        return at === 0 ? '' : `${value.slice(0, at)}${FORM_VALUE_SEPARATOR}`;
    }

    return encodeURIComponent(value);
}

function parameterOf(parameters: string[], prefix: string): string {
    const found = parameters.find(parameter => parameter.toLowerCase().startsWith(prefix));

    return found == null ? '' : RequestLines.unquote(found.slice(prefix.length));
}

interface AddFormPartOptions {
    state: CurlState;
    raw: string;
    allowsFiles: boolean;
}

function addFormPart({ state, raw, allowsFiles }: AddFormPartOptions): void {
    const separator = raw.indexOf(FORM_VALUE_SEPARATOR);
    if (separator <= 0) {
        return;
    }

    const name = raw.slice(0, separator);
    const rest = raw.slice(separator + 1);
    const isFile = allowsFiles && (rest.startsWith(FILE_PREFIX) || rest.startsWith(FILE_TEXT_PREFIX));
    if (!isFile) {
        const typeIndex = allowsFiles ? rest.indexOf(`${FORM_PARAMETER_SEPARATOR}${TYPE_PARAMETER}`) : -1;
        state.parts.push(SnippetBodies.textPart(name, typeIndex === -1 ? rest : rest.slice(0, typeIndex)));

        return;
    }

    const [path = '', ...parameters] = rest
        .slice(FILE_PREFIX.length)
        .split(FORM_PARAMETER_SEPARATOR);
    const declaredFileName = parameterOf(parameters, FILE_NAME_PARAMETER);
    const fileName = declaredFileName === '' ? path : declaredFileName;
    state.parts.push(SnippetBodies.filePart({
        name,
        fileName,
        contentType: parameterOf(parameters, TYPE_PARAMETER),
    }));
}

interface AddAuthorizationOptions {
    state: CurlState;
    scheme: string;
    credentials: string;
}

function addAuthorization({ state, scheme, credentials }: AddAuthorizationOptions): void {
    state.headers.push({
        name: HEADER_NAMES.Authorization,
        value: `${scheme} ${credentials}`,
    });
}

const VALUE_HANDLERS: Record<string, ValueHandler> = {
    'request': (state, value) => {
        state.method = value.toUpperCase();
    },
    'header': addHeader,
    'data': addData,
    'data-ascii': addData,
    'data-binary': addData,
    'data-raw': (state, value) => {
        state.data.push(value);
    },
    'data-urlencode': (state, value) => {
        state.data.push(urlEncodedPiece(value));
    },
    'json': (state, value) => {
        addData(state, value);
        state.isJson = true;
    },
    'form': (state, value) => addFormPart({ state, raw: value, allowsFiles: true }),
    'form-string': (state, value) => addFormPart({ state, raw: value, allowsFiles: false }),
    'cookie': (state, value) => {
        if (value.includes(FORM_VALUE_SEPARATOR)) {
            state.cookies.push(...CookieHeader.parse(value));
        }
    },
    'user-agent': (state, value) => addHeader(state, `${HEADER_NAMES.UserAgent}: ${value}`),
    'referer': (state, value) => addHeader(
        /* state: */ state,
        /* raw: */ `${HEADER_NAMES.Referer}: ${value.replace(REFERER_AUTO_SUFFIX, '')}`,
    ),
    'user': (state, value) => {
        const userAndPassword = value.includes(USER_SEPARATOR)
            ? value
            : `${value}${USER_SEPARATOR}`;
        addAuthorization({
            state,
            scheme: BASIC_SCHEME,
            credentials: Base64Text.fromUtf8(userAndPassword),
        });
    },
    'oauth2-bearer': (state, value) => addAuthorization({ state, scheme: BEARER_SCHEME, credentials: value }),
    'upload-file': (state, value) => {
        state.uploadFile = value;
    },
    'url': (state, value) => {
        state.url ??= value;
    },
};

const FLAG_HANDLERS: Record<string, FlagHandler> = {
    'get': state => {
        state.isGet = true;
    },
    'head': state => {
        state.isHead = true;
    },
};

const IGNORED_VALUE_OPTIONS = [
    'output',
    'max-time',
    'connect-timeout',
    'proxy',
    'proxy-user',
    'proxy-header',
    'write-out',
    'cookie-jar',
    'dump-header',
    'cert',
    'cert-type',
    'key',
    'key-type',
    'pass',
    'cacert',
    'capath',
    'ciphers',
    'retry',
    'retry-delay',
    'retry-max-time',
    'max-redirs',
    'max-filesize',
    'resolve',
    'connect-to',
    'limit-rate',
    'range',
    'aws-sigv4',
    'interface',
    'local-port',
    'keepalive-time',
    'config',
    'tls-max',
    'unix-socket',
    'abstract-unix-socket',
    'proto',
    'proto-redir',
    'request-target',
    'variable',
    'expect100-timeout',
    'dns-servers',
    'doh-url',
    'noproxy',
    'socks5',
    'socks5-hostname',
    'preproxy',
    'trace',
    'trace-ascii',
    'stderr',
    'output-dir',
    'time-cond',
    'quote',
    'continue-at',
    'ftp-port',
    'netrc-file',
    'url-query',
    'hsts',
    'alt-svc',
    'etag-compare',
    'etag-save',
    'speed-limit',
    'speed-time',
    'telnet-option',
];

const SHORT_OPTIONS: Record<string, string> = Object.freeze({
    'X': 'request',
    'H': 'header',
    'd': 'data',
    'F': 'form',
    'b': 'cookie',
    'A': 'user-agent',
    'e': 'referer',
    'u': 'user',
    'T': 'upload-file',
    'G': 'get',
    'I': 'head',
    'o': 'output',
    'm': 'max-time',
    'x': 'proxy',
    'U': 'proxy-user',
    'w': 'write-out',
    'c': 'cookie-jar',
    'D': 'dump-header',
    'E': 'cert',
    'K': 'config',
    'r': 'range',
    'Y': 'speed-limit',
    'y': 'speed-time',
    'z': 'time-cond',
    'C': 'continue-at',
    'P': 'ftp-port',
    'Q': 'quote',
    't': 'telnet-option',
});

const OPTIONS = new CommandOptions<CurlState>({
    valueHandlers: VALUE_HANDLERS,
    flagHandlers: FLAG_HANDLERS,
    ignoredValueOptions: IGNORED_VALUE_OPTIONS,
});

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
        if (CommandOptions.isLong(argument)) {
            index = OPTIONS.readLong({ state, args, index });
            continue;
        }

        if (argument.startsWith(SHORT_PREFIX) && argument.length > SHORT_PREFIX.length) {
            for (let position = SHORT_PREFIX.length; position < argument.length; position++) {
                const option = SHORT_OPTIONS[argument.charAt(position)];
                if (option == null) {
                    continue;
                }

                if (!OPTIONS.takesValue(option)) {
                    OPTIONS.applyFlag(state, option);
                    continue;
                }

                const attached = argument.slice(position + 1);
                const value = attached === '' ? args[++index] : attached;
                if (value != null) {
                    OPTIONS.applyValue({ state, option, value });
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
    if (fileName != null) {
        return SnippetBodies.file(fileName);
    }

    return state.isGet ? SnippetBodies.none() : SnippetBodies.text(state.data.join(DATA_SEPARATOR));
}

function methodOf(state: CurlState, body: SnippetBody): string {
    if (state.method != null) {
        return state.method;
    }

    if (state.isHead) {
        return HTTP_METHODS.Head;
    }

    if (state.isGet) {
        return HTTP_METHODS.Get;
    }

    if (state.uploadFile != null) {
        return HTTP_METHODS.Put;
    }

    return SnippetBodies.hasBody(body) ? HTTP_METHODS.Post : HTTP_METHODS.Get;
}

function withDefaultHeaders(state: CurlState, body: SnippetBody): HeaderEntry[] {
    if (
        !SnippetBodies.hasBody(body)
        || state.parts.length > 0
        || state.uploadFile != null
        || state.dataFile != null
    ) {
        return state.headers;
    }

    const defaults = state.isJson
        ? [
            {
                name: HEADER_NAMES.ContentType,
                value: JSON_MEDIA_TYPE,
            },
            {
                name: HEADER_NAMES.Accept,
                value: JSON_MEDIA_TYPE,
            },
        ]
        : [
            {
                name: HEADER_NAMES.ContentType,
                value: FORM_MEDIA_TYPE,
            },
        ];

    return [
        ...state.headers,
        ...defaults.filter(header => SnippetHeaders.find(
            /* headers: */ state.headers,
            /* name: */ header.name.toLowerCase(),
        ) == null),
    ];
}

function urlOf(state: CurlState, rawUrl: string): string {
    const url = RequestLines.withScheme(rawUrl);
    if (!state.isGet || state.data.length === 0) {
        return url;
    }

    const separator = url.includes(QUERY_SEPARATOR) ? DATA_SEPARATOR : QUERY_SEPARATOR;

    return `${url}${separator}${state.data.join(DATA_SEPARATOR)}`;
}

export const CurlOptionParser = {
    parse(args: string[], standardInput: string | null): SnippetRequest | null {
        const state = newState(standardInput);
        readArguments(state, args);
        if (state.url == null) {
            return null;
        }

        const body = bodyOf(state);

        return {
            method: methodOf(state, body),
            url: urlOf(state, state.url),
            headers: withDefaultHeaders(state, body),
            cookies: state.cookies,
            body,
        };
    },
};
