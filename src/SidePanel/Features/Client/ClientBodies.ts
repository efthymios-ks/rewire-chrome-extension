import { type MultipartPart, type SnippetBody, SnippetBodies } from "../../../Common/CodeGen/SnippetBody";
import { MediaTypeNames } from "../../../Contracts/Http/MediaTypeNames";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import { type ClientBody, ClientBodyType, type KeyValueRow, type MultipartRow } from "./ClientRequest";

const ContentTypeHeader = "Content-Type";
const BodylessMethods = [
    "GET",
    "HEAD",
];
const NoFileText = "(no file picked)";
const GraphQlQueryKey = "query";

type BodyReader<TValue> = (body: ClientBody) => TValue;

function namedRows<TRow extends KeyValueRow>(rows: TRow[]): TRow[] {
    return rows.filter(row => row.name.trim() !== "");
}

function fileText(name: string, size: number): string {
    return `${name} (${size} bytes)`;
}

function formParametersOf(rows: KeyValueRow[]): URLSearchParams {
    return new URLSearchParams(namedRows(rows).map(row => [
        row.name,
        row.value,
    ]));
}

function textOrNull(text: string): string | null {
    return text === "" ? null : text;
}

function graphQlBodyOf(query: string): string {
    return JSON.stringify({
        [GraphQlQueryKey]: query,
    });
}

function multipartFormOf(rows: MultipartRow[]): FormData | null {
    const named = namedRows(rows);
    if (named.length === 0) {
        return null;
    }

    const form = new FormData();
    named.forEach(row => {
        if (!row.isFile) {
            form.append(row.name, row.value);

            return;
        }

        if (row.file !== null) {
            form.append(
                row.name,
                row.file,
                row.file.name
            );
        }
    });

    return form;
}

function multipartLineOf(row: MultipartRow): string {
    if (!row.isFile) {
        return `${row.name}: ${row.value}`;
    }

    return row.file === null ? `${row.name}: ${NoFileText}` : `${row.name}: ${fileText(row.file.name, row.file.size)}`;
}

function snippetPartOf(row: MultipartRow): MultipartPart | null {
    if (!row.isFile) {
        return SnippetBodies.textPart(row.name, row.value);
    }

    const fileName = row.file?.name ?? row.fileName;

    return fileName === ""
        ? null
        : SnippetBodies.filePart(
            row.name,
            fileName,
            row.file?.type ?? ""
        );
}

function snippetFileOf(body: ClientBody): SnippetBody {
    const fileName = body.file?.name ?? body.fileName;

    return fileName === "" ? SnippetBodies.none() : SnippetBodies.file(fileName);
}

const ContentTypes: Record<ClientBodyType, BodyReader<string | null>> = {
    [ClientBodyType.None]: () => null,
    [ClientBodyType.Text]: () => MediaTypeNames.TextPlain,
    [ClientBodyType.Json]: () => MediaTypeNames.ApplicationJson,
    [ClientBodyType.Xml]: () => MediaTypeNames.ApplicationXml,
    [ClientBodyType.FormUrlEncoded]: () => MediaTypeNames.ApplicationFormUrlEncoded,
    [ClientBodyType.Multipart]: () => null,
    [ClientBodyType.Binary]: body => body.file === null ? null : body.file.type || MediaTypeNames.ApplicationOctet,
    [ClientBodyType.GraphQl]: () => MediaTypeNames.ApplicationJson,
};

const FetchBodies: Record<ClientBodyType, BodyReader<BodyInit | null>> = {
    [ClientBodyType.None]: () => null,
    [ClientBodyType.Text]: body => textOrNull(body.text),
    [ClientBodyType.Json]: body => textOrNull(body.text),
    [ClientBodyType.Xml]: body => textOrNull(body.text),
    [ClientBodyType.FormUrlEncoded]: body => namedRows(body.formRows).length === 0 ? null : formParametersOf(body.formRows),
    [ClientBodyType.Multipart]: body => multipartFormOf(body.multipartRows),
    [ClientBodyType.Binary]: body => body.file,
    [ClientBodyType.GraphQl]: body => graphQlBodyOf(body.graphQlQuery),
};

const LogTexts: Record<ClientBodyType, BodyReader<string>> = {
    [ClientBodyType.None]: () => "",
    [ClientBodyType.Text]: body => body.text,
    [ClientBodyType.Json]: body => body.text,
    [ClientBodyType.Xml]: body => body.text,
    [ClientBodyType.FormUrlEncoded]: body => formParametersOf(body.formRows).toString(),
    [ClientBodyType.Multipart]: body => namedRows(body.multipartRows)
        .map(multipartLineOf)
        .join("\n"),
    [ClientBodyType.Binary]: body => body.file === null ? NoFileText : fileText(body.file.name, body.file.size),
    [ClientBodyType.GraphQl]: body => graphQlBodyOf(body.graphQlQuery),
};

const SnippetBodyReaders: Record<ClientBodyType, BodyReader<SnippetBody>> = {
    [ClientBodyType.None]: () => SnippetBodies.none(),
    [ClientBodyType.Text]: body => SnippetBodies.text(body.text),
    [ClientBodyType.Json]: body => SnippetBodies.text(body.text),
    [ClientBodyType.Xml]: body => SnippetBodies.text(body.text),
    [ClientBodyType.FormUrlEncoded]: body => SnippetBodies.text(formParametersOf(body.formRows).toString()),
    [ClientBodyType.Multipart]: body => SnippetBodies.multipart(namedRows(body.multipartRows)
        .map(snippetPartOf)
        .filter((part): part is MultipartPart => part !== null)),
    [ClientBodyType.Binary]: snippetFileOf,
    [ClientBodyType.GraphQl]: body => SnippetBodies.text(graphQlBodyOf(body.graphQlQuery)),
};

export const ClientBodies = {
    empty(): ClientBody {
        return {
            type: ClientBodyType.None,
            text: "",
            formRows: [],
            multipartRows: [],
            file: null,
            fileName: "",
            graphQlQuery: "",
        };
    },

    sentWith(method: string, body: ClientBody): ClientBody {
        return BodylessMethods.includes(method.toUpperCase()) ? ClientBodies.empty() : body;
    },

    dropsBody(method: string, body: ClientBody): boolean {
        return BodylessMethods.includes(method.toUpperCase()) && body.type !== ClientBodyType.None;
    },

    contentTypeOf(body: ClientBody): string | null {
        return ContentTypes[body.type](body);
    },

    fetchBodyOf(body: ClientBody): BodyInit | null {
        return FetchBodies[body.type](body);
    },

    logTextOf(body: ClientBody): string {
        return LogTexts[body.type](body);
    },

    snippetBodyOf(body: ClientBody): SnippetBody {
        return SnippetBodyReaders[body.type](body);
    },

    withContentType(headers: HeaderEntry[], body: ClientBody): HeaderEntry[] {
        const named = headers.filter(header => header.name.trim() !== "");
        const hasContentType = named.some(header => header.name.trim().toLowerCase() === ContentTypeHeader.toLowerCase());
        const contentType = ClientBodies.contentTypeOf(body);
        if (hasContentType || contentType === null) {
            return named;
        }

        return [
            ...named,
            {
                name: ContentTypeHeader,
                value: contentType,
            },
        ];
    },
};
