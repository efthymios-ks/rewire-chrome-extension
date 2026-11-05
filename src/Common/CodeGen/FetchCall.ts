import type { HeaderEntry } from "../../Contracts/Timeline/HeaderEntry";
import type { RequestSnapshot, SnippetOptions } from "./RequestSnapshot";
import { type SnippetParts as Parts, SnippetHeaderNames, SnippetParts } from "./SnippetParts";

const Indentation = "    ";
const JsonIndentation = 4;

export interface FetchDialect {
    headersOf(parts: Parts): HeaderEntry[];
    extraOptions(parts: Parts): Array<[string, string]>;
}

function indentBlock(text: string): string {
    return text
        .split("\n")
        .map((line, index) => index === 0 ? line : `${Indentation}${line}`)
        .join("\n");
}

function headersObjectOf(headers: HeaderEntry[]): string {
    const entries = SnippetParts
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

export const FetchCall = {
    build(
        snapshot: RequestSnapshot,
        options: SnippetOptions,
        dialect: FetchDialect
    ): string {
        const parts = SnippetParts.of(snapshot, options);
        const headers = dialect.headersOf(parts);
        const body = SnippetParts.isBodyless(parts.method) ? null : parts.body;
        const lines = [
            `${Indentation}method: ${JSON.stringify(parts.method)},`,
            headers.length === 0 ? null : `${Indentation}headers: ${headersObjectOf(headers)},`,
            body === null ? null : `${Indentation}body: ${JSON.stringify(body)},`,
            ...dialect
                .extraOptions(parts)
                .map(([name, value]) => `${Indentation}${name}: ${value},`),
        ];

        return [
            `await fetch(${JSON.stringify(parts.url)}, {`,
            ...lines.filter((line): line is string => line !== null),
            "});",
        ].join("\n");
    },

    withoutAcceptEncoding(headers: HeaderEntry[]): HeaderEntry[] {
        return SnippetParts.without(headers, [SnippetHeaderNames.AcceptEncoding]);
    },
};
