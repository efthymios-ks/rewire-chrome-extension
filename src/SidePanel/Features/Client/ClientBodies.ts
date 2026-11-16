import type { MultipartPart } from '../../../Common/CodeGen/MultipartPart';
import { SnippetBodies } from '../../../Common/CodeGen/SnippetBodies';
import type { SnippetBody } from '../../../Common/CodeGen/SnippetBody';
import { SnippetRequests } from '../../../Common/CodeGen/SnippetRequests';
import { GRAPHQL_QUERY_KEY } from '../../../Common/Content/GraphQlQueryKey';
import { HEADER_NAMES } from '../../../Contracts/Http/HeaderNames';
import { MEDIA_TYPE_NAMES } from '../../../Contracts/Http/MediaTypeNames';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import type { ClientBody } from './ClientBody';
import { CLIENT_BODY_TYPE, type ClientBodyType } from './ClientBodyType';
import type { KeyValueRow } from './KeyValueRow';
import type { MultipartRow } from './MultipartRow';

const NO_FILE_TEXT = '(no file picked)';

type BodyReader<TValue> = (body: ClientBody) => TValue;

function namedRows<TRow extends KeyValueRow>(rows: TRow[]): TRow[] {
    return rows.filter(row => row.name.trim() !== '');
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
    return text === '' ? null : text;
}

function graphQlBodyOf(query: string): string {
    return JSON.stringify({
        [GRAPHQL_QUERY_KEY]: query,
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

        if (row.file != null) {
            form.append(
                /* name: */ row.name,
                /* blobValue: */ row.file,
                /* filename: */ row.file.name,
            );
        }
    });

    return form;
}

function multipartLineOf(row: MultipartRow): string {
    if (!row.isFile) {
        return `${row.name}: ${row.value}`;
    }

    return row.file == null
        ? `${row.name}: ${NO_FILE_TEXT}`
        : `${row.name}: ${fileText(row.file.name, row.file.size)}`;
}

function snippetPartOf(row: MultipartRow): MultipartPart | null {
    if (!row.isFile) {
        return SnippetBodies.textPart(row.name, row.value);
    }

    const fileName = row.file?.name ?? row.fileName;

    return fileName === ''
        ? null
        : SnippetBodies.filePart({ name: row.name, fileName, contentType: row.file?.type ?? '' });
}

function snippetFileOf(body: ClientBody): SnippetBody {
    const fileName = body.file?.name ?? body.fileName;

    return fileName === '' ? SnippetBodies.none() : SnippetBodies.file(fileName);
}

const CONTENT_TYPES: Record<ClientBodyType, BodyReader<string | null>> = {
    [CLIENT_BODY_TYPE.None]: () => null,
    [CLIENT_BODY_TYPE.Text]: () => MEDIA_TYPE_NAMES.TextPlain,
    [CLIENT_BODY_TYPE.Json]: () => MEDIA_TYPE_NAMES.ApplicationJson,
    [CLIENT_BODY_TYPE.Xml]: () => MEDIA_TYPE_NAMES.ApplicationXml,
    [CLIENT_BODY_TYPE.FormUrlEncoded]: () => MEDIA_TYPE_NAMES.ApplicationFormUrlEncoded,
    [CLIENT_BODY_TYPE.Multipart]: () => null,
    [CLIENT_BODY_TYPE.Binary]: body => {
        if (body.file == null) {
            return null;
        }

        return body.file.type === '' ? MEDIA_TYPE_NAMES.ApplicationOctet : body.file.type;
    },
    [CLIENT_BODY_TYPE.GraphQl]: () => MEDIA_TYPE_NAMES.ApplicationJson,
};

const FETCH_BODIES: Record<ClientBodyType, BodyReader<BodyInit | null>> = {
    [CLIENT_BODY_TYPE.None]: () => null,
    [CLIENT_BODY_TYPE.Text]: body => textOrNull(body.text),
    [CLIENT_BODY_TYPE.Json]: body => textOrNull(body.text),
    [CLIENT_BODY_TYPE.Xml]: body => textOrNull(body.text),
    [CLIENT_BODY_TYPE.FormUrlEncoded]: body => namedRows(body.formRows).length === 0
        ? null
        : formParametersOf(body.formRows),
    [CLIENT_BODY_TYPE.Multipart]: body => multipartFormOf(body.multipartRows),
    [CLIENT_BODY_TYPE.Binary]: body => body.file,
    [CLIENT_BODY_TYPE.GraphQl]: body => graphQlBodyOf(body.graphQlQuery),
};

const LOG_TEXTS: Record<ClientBodyType, BodyReader<string>> = {
    [CLIENT_BODY_TYPE.None]: () => '',
    [CLIENT_BODY_TYPE.Text]: body => body.text,
    [CLIENT_BODY_TYPE.Json]: body => body.text,
    [CLIENT_BODY_TYPE.Xml]: body => body.text,
    [CLIENT_BODY_TYPE.FormUrlEncoded]: body => formParametersOf(body.formRows).toString(),
    [CLIENT_BODY_TYPE.Multipart]: body => namedRows(body.multipartRows)
        .map(multipartLineOf)
        .join('\n'),
    [CLIENT_BODY_TYPE.Binary]: body => body.file == null
        ? NO_FILE_TEXT
        : fileText(body.file.name, body.file.size),
    [CLIENT_BODY_TYPE.GraphQl]: body => graphQlBodyOf(body.graphQlQuery),
};

const SNIPPET_BODY_READERS: Record<ClientBodyType, BodyReader<SnippetBody>> = {
    [CLIENT_BODY_TYPE.None]: () => SnippetBodies.none(),
    [CLIENT_BODY_TYPE.Text]: body => SnippetBodies.text(body.text),
    [CLIENT_BODY_TYPE.Json]: body => SnippetBodies.text(body.text),
    [CLIENT_BODY_TYPE.Xml]: body => SnippetBodies.text(body.text),
    [CLIENT_BODY_TYPE.FormUrlEncoded]: body => SnippetBodies.text(formParametersOf(body.formRows).toString()),
    [CLIENT_BODY_TYPE.Multipart]: body => SnippetBodies.multipart(namedRows(body.multipartRows)
        .map(snippetPartOf)
        .filter((part): part is MultipartPart => part != null)),
    [CLIENT_BODY_TYPE.Binary]: snippetFileOf,
    [CLIENT_BODY_TYPE.GraphQl]: body => SnippetBodies.text(graphQlBodyOf(body.graphQlQuery)),
};

export const ClientBodies = {
    empty(): ClientBody {
        return {
            type: CLIENT_BODY_TYPE.None,
            text: '',
            formRows: [],
            multipartRows: [],
            file: null,
            fileName: '',
            graphQlQuery: '',
        };
    },

    sentWith(method: string, body: ClientBody): ClientBody {
        return SnippetRequests.isBodyless(method.toUpperCase()) ? ClientBodies.empty() : body;
    },

    dropsBody(method: string, body: ClientBody): boolean {
        return SnippetRequests.isBodyless(method.toUpperCase()) && body.type !== CLIENT_BODY_TYPE.None;
    },

    contentTypeOf(body: ClientBody): string | null {
        return CONTENT_TYPES[body.type](body);
    },

    fetchBodyOf(body: ClientBody): BodyInit | null {
        return FETCH_BODIES[body.type](body);
    },

    logTextOf(body: ClientBody): string {
        return LOG_TEXTS[body.type](body);
    },

    snippetBodyOf(body: ClientBody): SnippetBody {
        return SNIPPET_BODY_READERS[body.type](body);
    },

    withContentType(headers: HeaderEntry[], body: ClientBody): HeaderEntry[] {
        const named = headers.filter(header => header.name.trim() !== '');
        const hasContentType = named.some(
            header => header.name.trim().toLowerCase() === HEADER_NAMES.ContentType.toLowerCase(),
        );
        const contentType = ClientBodies.contentTypeOf(body);
        if (hasContentType || contentType == null) {
            return named;
        }

        return [
            ...named,
            {
                name: HEADER_NAMES.ContentType,
                value: contentType,
            },
        ];
    },
};
