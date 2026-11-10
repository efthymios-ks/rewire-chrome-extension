import { type MultipartPart, type SnippetBody, SnippetBodies, SnippetBodyKind } from "./SnippetBody";
import { SnippetHeaderNames, SnippetHeaders } from "./SnippetHeaders";
import { type SnippetRequest, SnippetRequests } from "./SnippetRequest";

const HeadMethod = "HEAD";
const PostMethod = "POST";
const GetMethod = "GET";
const FormStringPrefixes = [
    "@",
    "<",
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
    return hasBody ? PostMethod : GetMethod;
}

function methodFlag(method: string, hasBody: boolean): string | null {
    if (method === HeadMethod && !hasBody) {
        return "--head";
    }

    return method === impliedMethodOf(hasBody) ? null : `-X ${method}`;
}

function partArgument(part: MultipartPart, quote: (value: string) => string): string {
    if (part.fileName === null) {
        const option = FormStringPrefixes.some(prefix => part.value.startsWith(prefix)) ? "--form-string" : "-F";

        return `${option} ${quote(`${part.name}=${part.value}`)}`;
    }

    const type = part.contentType === "" ? "" : `;type=${part.contentType}`;

    return `-F ${quote(`${part.name}=@${part.fileName}${type}`)}`;
}

function bodyArgumentsOf(body: SnippetBody, dialect: CurlDialect): CurlBodyArguments {
    switch (body.kind) {
        case SnippetBodyKind.Text: {
            const text = dialect.textBody(body.text);

            return {
                pipe: text.pipe,
                arguments: [text.argument],
            };
        }
        case SnippetBodyKind.Multipart:
            return {
                pipe: null,
                arguments: body.parts.map(part => partArgument(part, dialect.quote)),
            };
        case SnippetBodyKind.File:
            return {
                pipe: null,
                arguments: [`--data-binary ${dialect.quote(`@${body.fileName}`)}`],
            };
        case SnippetBodyKind.None:
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
        const isCompressed = SnippetHeaders.find(request.headers, SnippetHeaderNames.AcceptEncoding) !== undefined;
        const skipped = request.body.kind === SnippetBodyKind.Multipart
            ? [
                SnippetHeaderNames.AcceptEncoding,
                SnippetHeaderNames.ContentType,
            ]
            : [SnippetHeaderNames.AcceptEncoding];
        const segments = [
            `${body.pipe ?? ""}curl ${quote(request.url)}`,
            methodFlag(request.method, hasBody),
            ...SnippetHeaders
                .without(request.headers, skipped)
                .map(header => `-H ${quote(`${header.name}: ${header.value}`)}`),
            cookie === null ? null : `-b ${quote(cookie)}`,
            ...body.arguments,
            isCompressed ? "--compressed" : null,
        ];
        const command = segments
            .filter((segment): segment is string => segment !== null)
            .join(dialect.lineContinuation);
        const preamble = dialect.preamble(command);

        return preamble === null ? command : `${preamble}\n${command}`;
    },
};
