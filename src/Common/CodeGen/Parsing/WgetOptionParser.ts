import { HEADER_NAMES } from '../../../Contracts/Http/HeaderNames';
import { HTTP_METHODS } from '../../../Contracts/Http/HttpMethods';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import { Base64Text } from '../../Encoding/Base64Text';
import { CookieHeader } from '../../Rules/Http/CookieHeader';
import type { CookiePair } from '../../Rules/Http/CookiePair';
import { SnippetBodies } from '../SnippetBodies';
import type { SnippetBody } from '../SnippetBody';
import type { SnippetRequest } from '../SnippetRequest';
import { CommandOptions } from './CommandOptions';
import { RequestLines } from './RequestLines';

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

const SHORT_PREFIX = '-';
const HEADER_SEPARATOR = ':';
const USER_SEPARATOR = ':';
const BASIC_SCHEME = 'Basic';

function addHeader(state: WgetState, raw: string): void {
    const separator = raw.indexOf(HEADER_SEPARATOR);
    if (separator <= 0) {
        return;
    }

    const name = raw.slice(0, separator).trim();
    const value = raw.slice(separator + 1).trim();
    if (name.toLowerCase() === HEADER_NAMES.Cookie.toLowerCase()) {
        state.cookies.push(...CookieHeader.parse(value));

        return;
    }

    state.headers.push({
        name,
        value,
    });
}

const VALUE_HANDLERS: Record<string, ValueHandler> = {
    'method': (state, value) => {
        state.method = value.toUpperCase();
    },
    'header': addHeader,
    'post-data': (state, value) => {
        state.body = SnippetBodies.text(value);
        state.isPost = true;
    },
    'post-file': (state, value) => {
        state.body = SnippetBodies.file(value);
        state.isPost = true;
    },
    'body-data': (state, value) => {
        state.body = SnippetBodies.text(value);
    },
    'body-file': (state, value) => {
        state.body = SnippetBodies.file(value);
    },
    'user-agent': (state, value) => addHeader(state, `${HEADER_NAMES.UserAgent}: ${value}`),
    'referer': (state, value) => addHeader(state, `${HEADER_NAMES.Referer}: ${value}`),
    'user': (state, value) => {
        state.user = value;
    },
    'http-user': (state, value) => {
        state.user = value;
    },
    'password': (state, value) => {
        state.password = value;
    },
    'http-password': (state, value) => {
        state.password = value;
    },
};

const IGNORED_VALUE_OPTIONS = [
    'output-document',
    'output-file',
    'append-output',
    'execute',
    'timeout',
    'dns-timeout',
    'connect-timeout',
    'read-timeout',
    'tries',
    'wait',
    'waitretry',
    'load-cookies',
    'save-cookies',
    'directory-prefix',
    'max-redirect',
    'ca-certificate',
    'ca-directory',
    'certificate',
    'certificate-type',
    'private-key',
    'private-key-type',
    'quota',
    'limit-rate',
    'input-file',
    'base',
    'level',
    'local-encoding',
    'remote-encoding',
    'bind-address',
    'proxy-user',
    'proxy-password',
    'secure-protocol',
];

const SHORT_OPTIONS: Record<string, string> = Object.freeze({
    'O': 'output-document',
    'o': 'output-file',
    'a': 'append-output',
    'e': 'execute',
    'T': 'timeout',
    't': 'tries',
    'w': 'wait',
    'U': 'user-agent',
    'P': 'directory-prefix',
    'Q': 'quota',
    'i': 'input-file',
    'B': 'base',
    'l': 'level',
});

const OPTIONS = new CommandOptions<WgetState>({
    valueHandlers: VALUE_HANDLERS,
    ignoredValueOptions: IGNORED_VALUE_OPTIONS,
});

function readArguments(state: WgetState, args: string[]): void {
    for (let index = 0; index < args.length; index++) {
        const argument = args[index]!;
        if (CommandOptions.isLong(argument)) {
            index = OPTIONS.readLong({ state, args, index });
            continue;
        }

        if (argument.startsWith(SHORT_PREFIX) && argument.length > SHORT_PREFIX.length) {
            const option = SHORT_OPTIONS[argument.charAt(SHORT_PREFIX.length)];
            if (option == null) {
                continue;
            }

            const attached = argument.slice(SHORT_PREFIX.length + 1);
            const value = attached === '' ? args[++index] : attached;
            if (value != null) {
                OPTIONS.applyValue({ state, option, value });
            }

            continue;
        }

        state.url ??= argument;
    }
}

function methodOf(state: WgetState): string {
    if (state.method != null) {
        return state.method;
    }

    return state.isPost || SnippetBodies.hasBody(state.body) ? HTTP_METHODS.Post : HTTP_METHODS.Get;
}

function headersOf(state: WgetState): HeaderEntry[] {
    if (state.user == null) {
        return state.headers;
    }

    const credentials = Base64Text.fromUtf8(`${state.user}${USER_SEPARATOR}${state.password}`);

    return [
        ...state.headers,
        {
            name: HEADER_NAMES.Authorization,
            value: `${BASIC_SCHEME} ${credentials}`,
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
            password: '',
        };
        readArguments(state, args);
        if (state.url == null) {
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
