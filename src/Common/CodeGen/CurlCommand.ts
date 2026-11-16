import { HEADER_NAMES } from '../../Contracts/Http/HeaderNames';
import type { MultipartPart } from './MultipartPart';
import { SnippetBodies } from './SnippetBodies';
import type { SnippetBody } from './SnippetBody';
import { SNIPPET_BODY_KIND } from './SnippetBodyKind';
import { SnippetHeaders } from './SnippetHeaders';
import type { SnippetRequest } from './SnippetRequest';
import { SnippetRequests } from './SnippetRequests';

const HEAD_METHOD = 'HEAD';
const POST_METHOD = 'POST';
const GET_METHOD = 'GET';
const FORM_STRING_PREFIXES = [
    '@',
    '<',
];

export interface CurlTextBody {
    pipe: string | null;
    argument: string;
}

export interface CurlDialect {
    lineContinuation: string;
    quote(value: string): string;
    textBody(text: string): CurlTextBody;
    preamble(command: string): string | null;
}

interface CurlBodyArguments {
    pipe: string | null;
    arguments: string[];
}

function impliedMethodOf(hasBody: boolean): string {
    return hasBody ? POST_METHOD : GET_METHOD;
}

function methodFlag(method: string, hasBody: boolean): string | null {
    if (method === HEAD_METHOD && !hasBody) {
        return '--head';
    }

    return method === impliedMethodOf(hasBody) ? null : `-X ${method}`;
}

function partArgument(part: MultipartPart, quote: (value: string) => string): string {
    if (part.fileName == null) {
        const option = FORM_STRING_PREFIXES.some(prefix => part.value.startsWith(prefix))
            ? '--form-string'
            : '-F';

        return `${option} ${quote(`${part.name}=${part.value}`)}`;
    }

    const type = part.contentType === '' ? '' : `;type=${part.contentType}`;

    return `-F ${quote(`${part.name}=@${part.fileName}${type}`)}`;
}

function bodyArgumentsOf(body: SnippetBody, dialect: CurlDialect): CurlBodyArguments {
    switch (body.kind) {
        case SNIPPET_BODY_KIND.Text: {
            const text = dialect.textBody(body.text);

            return {
                pipe: text.pipe,
                arguments: [text.argument],
            };
        }
        case SNIPPET_BODY_KIND.Multipart:
            return {
                pipe: null,
                arguments: body.parts.map(part => partArgument(part, dialect.quote)),
            };
        case SNIPPET_BODY_KIND.File:
            return {
                pipe: null,
                arguments: [`--data-binary ${dialect.quote(`@${body.fileName}`)}`],
            };
        case SNIPPET_BODY_KIND.None:
            return {
                pipe: null,
                arguments: [],
            };
    }
}

export const CurlCommand = {
    render(request: SnippetRequest, dialect: CurlDialect): string {
        const quote = dialect.quote;
        const hasBody = SnippetBodies.hasBody(request.body);
        const body = bodyArgumentsOf(request.body, dialect);
        const cookie = SnippetRequests.cookieTextOf(request);
        const acceptEncoding = SnippetHeaders.find(request.headers, HEADER_NAMES.AcceptEncoding);
        const isCompressed = acceptEncoding != null;
        const skipped = request.body.kind === SNIPPET_BODY_KIND.Multipart
            ? [
                HEADER_NAMES.AcceptEncoding,
                HEADER_NAMES.ContentType,
            ]
            : [HEADER_NAMES.AcceptEncoding];
        const segments = [
            `${body.pipe ?? ''}curl ${quote(request.url)}`,
            methodFlag(request.method, hasBody),
            ...SnippetHeaders
                .without(request.headers, skipped)
                .map(header => `-H ${quote(`${header.name}: ${header.value}`)}`),
            cookie == null ? null : `-b ${quote(cookie)}`,
            ...body.arguments,
            isCompressed ? '--compressed' : null,
        ];
        const command = segments
            .filter((segment): segment is string => segment != null)
            .join(dialect.lineContinuation);
        const preamble = dialect.preamble(command);

        return preamble == null ? command : `${preamble}\n${command}`;
    },
};
