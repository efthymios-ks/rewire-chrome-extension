import type { RequestSnapshot, SnippetOptions } from "./RequestSnapshot";
import { SnippetHeaderNames, SnippetParts } from "./SnippetParts";

const HeadMethod = "HEAD";
const PostMethod = "POST";
const GetMethod = "GET";

export interface CurlBody {
    pipe: string | null;
    argument: string;
}

export interface ShellDialect {
    lineContinuation: string;
    quote(value: string): string;
    body(body: string): CurlBody;
    preamble(command: string): string | null;
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

export const CurlCommand = {
    build(
        snapshot: RequestSnapshot,
        options: SnippetOptions,
        dialect: ShellDialect
    ): string {
        const parts = SnippetParts.of(snapshot, options);
        const quote = dialect.quote;
        const body = parts.body === null ? null : dialect.body(parts.body);
        const isCompressed = SnippetParts.find(parts.headers, SnippetHeaderNames.AcceptEncoding) !== undefined;
        const headers = SnippetParts.without(parts.headers, [SnippetHeaderNames.AcceptEncoding]);
        const segments = [
            `${body?.pipe ?? ""}curl ${quote(parts.url)}`,
            methodFlag(parts.method, body !== null),
            ...headers.map(header => `-H ${quote(`${header.name}: ${header.value}`)}`),
            parts.cookie === null ? null : `-b ${quote(parts.cookie)}`,
            body?.argument ?? null,
            isCompressed ? "--compressed" : null,
        ];
        const command = segments
            .filter((segment): segment is string => segment !== null)
            .join(dialect.lineContinuation);
        const preamble = dialect.preamble(command);

        return preamble === null ? command : `${preamble}\n${command}`;
    },
};
