import type { HeaderEntry } from "../../Contracts/Timeline/HeaderEntry";
import { type SnippetBody, SnippetBodyKind } from "./SnippetBody";
import { SnippetHeaderNames, SnippetHeaders } from "./SnippetHeaders";
import { type SnippetRequest, SnippetRequests } from "./SnippetRequest";

const Indentation = "    ";
const JsonIndentation = 4;
const FormVariable = "form";

export interface FetchDialect {
    headersOf(request: SnippetRequest): HeaderEntry[];
    extraOptions(request: SnippetRequest): Array<[string, string]>;
    fileExpression(fileName: string): string;
    preamble(request: SnippetRequest): string[];
}

function indentBlock(text: string): string {
    return text
        .split("\n")
        .map((line, index) => index === 0 ? line : `${Indentation}${line}`)
        .join("\n");
}

function headersObjectOf(headers: HeaderEntry[]): string {
    const entries = SnippetHeaders
        .merged(headers)
        .map(header => [
            header.name,
            header.value,
        ]);

    return indentBlock(JSON.stringify(
        Object.fromEntries(entries),
        null,
        JsonIndentation
    ));
}

function formLinesOf(body: SnippetBody, dialect: FetchDialect): string[] {
    if (body.kind !== SnippetBodyKind.Multipart) {
        return [];
    }

    return [
        `const ${FormVariable} = new FormData();`,
        ...body.parts.map(part => part.fileName === null
            ? `${FormVariable}.append(${JSON.stringify(part.name)}, ${JSON.stringify(part.value)});`
            : `${FormVariable}.append(${JSON.stringify(part.name)}, ${dialect.fileExpression(part.fileName)}, ${JSON.stringify(part.fileName)});`),
    ];
}

function bodyExpressionOf(body: SnippetBody, dialect: FetchDialect): string | null {
    switch (body.kind) {
        case SnippetBodyKind.Text:
            return JSON.stringify(body.text);
        case SnippetBodyKind.File:
            return dialect.fileExpression(body.fileName);
        case SnippetBodyKind.Multipart:
            return FormVariable;
        case SnippetBodyKind.None:
            return null;
    }
}

export const FetchCall = {
    render(request: SnippetRequest, dialect: FetchDialect): string {
        const isBodyless = SnippetRequests.isBodyless(request.method);
        const body = isBodyless ? null : bodyExpressionOf(request.body, dialect);
        const headers = request.body.kind === SnippetBodyKind.Multipart
            ? SnippetHeaders.without(dialect.headersOf(request), [SnippetHeaderNames.ContentType])
            : dialect.headersOf(request);
        const lines = [
            `${Indentation}method: ${JSON.stringify(request.method)},`,
            headers.length === 0 ? null : `${Indentation}headers: ${headersObjectOf(headers)},`,
            body === null ? null : `${Indentation}body: ${body},`,
            ...dialect
                .extraOptions(request)
                .map(([name, value]) => `${Indentation}${name}: ${value},`),
        ];

        return [
            ...dialect.preamble(request),
            ...(isBodyless ? [] : formLinesOf(request.body, dialect)),
            `await fetch(${JSON.stringify(request.url)}, {`,
            ...lines.filter((line): line is string => line !== null),
            "});",
        ].join("\n");
    },

    withoutAcceptEncoding(headers: HeaderEntry[]): HeaderEntry[] {
        return SnippetHeaders.without(headers, [SnippetHeaderNames.AcceptEncoding]);
    },

    usesFiles(body: SnippetBody): boolean {
        return body.kind === SnippetBodyKind.File
            || (body.kind === SnippetBodyKind.Multipart && body.parts.some(part => part.fileName !== null));
    },
};
