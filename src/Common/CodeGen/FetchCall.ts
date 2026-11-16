import { HEADER_NAMES } from '../../Contracts/Http/HeaderNames';
import type { HeaderEntry } from '../../Contracts/Timeline/HeaderEntry';
import type { MultipartPart } from './MultipartPart';
import type { SnippetBody } from './SnippetBody';
import { SNIPPET_BODY_KIND } from './SnippetBodyKind';
import { SnippetHeaders } from './SnippetHeaders';
import type { SnippetRequest } from './SnippetRequest';
import { SnippetRequests } from './SnippetRequests';

const INDENTATION = '    ';
const JSON_INDENTATION = 4;
const FORM_VARIABLE = 'form';

export interface FetchDialect {
    headersOf(request: SnippetRequest): HeaderEntry[];
    extraOptions(request: SnippetRequest): Array<[string, string]>;
    fileExpression(fileName: string): string;
    preamble(request: SnippetRequest): string[];
}

function indentBlock(text: string): string {
    return text
        .split('\n')
        .map((line, index) => index === 0 ? line : `${INDENTATION}${line}`)
        .join('\n');
}

function headersObjectOf(headers: HeaderEntry[]): string {
    const entries = SnippetHeaders
        .merged(headers)
        .map(header => [
            header.name,
            header.value,
        ]);

    return indentBlock(JSON.stringify(
        /* value: */ Object.fromEntries(entries),
        /* replacer: */ null,
        /* space: */ JSON_INDENTATION,
    ));
}

function formAppendLineOf(part: MultipartPart, dialect: FetchDialect): string {
    const name = JSON.stringify(part.name);
    if (part.fileName == null) {
        return `${FORM_VARIABLE}.append(${name}, ${JSON.stringify(part.value)});`;
    }

    const file = dialect.fileExpression(part.fileName);

    return `${FORM_VARIABLE}.append(${name}, ${file}, ${JSON.stringify(part.fileName)});`;
}

function formLinesOf(body: SnippetBody, dialect: FetchDialect): string[] {
    if (body.kind !== SNIPPET_BODY_KIND.Multipart) {
        return [];
    }

    return [
        `const ${FORM_VARIABLE} = new FormData();`,
        ...body.parts.map(part => formAppendLineOf(part, dialect)),
    ];
}

function bodyExpressionOf(body: SnippetBody, dialect: FetchDialect): string | null {
    switch (body.kind) {
        case SNIPPET_BODY_KIND.Text:
            return JSON.stringify(body.text);
        case SNIPPET_BODY_KIND.File:
            return dialect.fileExpression(body.fileName);
        case SNIPPET_BODY_KIND.Multipart:
            return FORM_VARIABLE;
        case SNIPPET_BODY_KIND.None:
            return null;
    }
}

export const FetchCall = {
    render(request: SnippetRequest, dialect: FetchDialect): string {
        const isBodyless = SnippetRequests.isBodyless(request.method);
        const body = isBodyless ? null : bodyExpressionOf(request.body, dialect);
        const headers = request.body.kind === SNIPPET_BODY_KIND.Multipart
            ? SnippetHeaders.without(
                /* headers: */ dialect.headersOf(request),
                /* names: */ [HEADER_NAMES.ContentType],
            )
            : dialect.headersOf(request);
        const lines = [
            `${INDENTATION}method: ${JSON.stringify(request.method)},`,
            headers.length === 0 ? null : `${INDENTATION}headers: ${headersObjectOf(headers)},`,
            body == null ? null : `${INDENTATION}body: ${body},`,
            ...dialect
                .extraOptions(request)
                .map(([name, value]) => `${INDENTATION}${name}: ${value},`),
        ];

        return [
            ...dialect.preamble(request),
            ...(isBodyless ? [] : formLinesOf(request.body, dialect)),
            `await fetch(${JSON.stringify(request.url)}, {`,
            ...lines.filter((line): line is string => line != null),
            '});',
        ].join('\n');
    },

    withoutAcceptEncoding(headers: HeaderEntry[]): HeaderEntry[] {
        return SnippetHeaders.without(headers, [HEADER_NAMES.AcceptEncoding]);
    },

    usesFiles(body: SnippetBody): boolean {
        return body.kind === SNIPPET_BODY_KIND.File
            || (body.kind === SNIPPET_BODY_KIND.Multipart && body.parts.some(part => part.fileName != null));
    },
};
