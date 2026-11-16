import type { MultipartPart } from '../../../Common/CodeGen/MultipartPart';
import type { RequestSnippet } from '../../../Common/CodeGen/RequestSnippet';
import type { SnippetBody } from '../../../Common/CodeGen/SnippetBody';
import { SNIPPET_BODY_KIND } from '../../../Common/CodeGen/SnippetBodyKind';
import { SnippetHeaders } from '../../../Common/CodeGen/SnippetHeaders';
import { GRAPHQL_QUERY_KEY } from '../../../Common/Content/GraphQlQueryKey';
import { MultipartText } from '../../../Common/Http/MultipartText';
import { JsonText } from '../../../Common/Json/JsonText';
import { CookieHeader } from '../../../Common/Rules/Http/CookieHeader';
import { HEADER_NAMES } from '../../../Contracts/Http/HeaderNames';
import { MEDIA_TYPE_NAMES } from '../../../Contracts/Http/MediaTypeNames';
import { MEDIA_TYPES } from '../../../Contracts/Http/MediaTypes';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import { ClientBodies } from './ClientBodies';
import type { ClientBody } from './ClientBody';
import { CLIENT_BODY_TYPE, type ClientBodyType } from './ClientBodyType';
import type { ClientRequest } from './ClientRequest';
import type { MultipartRow } from './MultipartRow';

const XML_MARKER = 'xml';
const XML_START = '<';

interface TextBodyRule {
    matches(contentType: string, text: string): boolean;
    build(text: string, contentType: string): ClientBody;
}

function bodyOf(type: ClientBodyType, changes: Partial<ClientBody>): ClientBody {
    return {
        ...ClientBodies.empty(),
        type,
        ...changes,
    };
}

function rowOf(part: MultipartPart): MultipartRow {
    const isFile = part.fileName != null;

    return {
        name: part.name,
        value: isFile ? '' : part.value,
        isFile,
        file: null,
        fileName: part.fileName ?? '',
    };
}

function graphQlQueryOf(text: string): string | null {
    const parsed = JsonText.tryParse(text);
    if (
        parsed.hasErrors
        || typeof parsed.value !== 'object'
        || parsed.value == null
        || Array.isArray(parsed.value)
    ) {
        return null;
    }

    const record = parsed.value as Record<string, unknown>;
    const query = record[GRAPHQL_QUERY_KEY];
    const keys = Object.keys(record);

    return typeof query === 'string' && keys.length === 1 ? query : null;
}

function isJsonDocument(text: string): boolean {
    const parsed = JsonText.tryParse(text);

    return !parsed.hasErrors
        && typeof parsed.value === 'object'
        && parsed.value != null;
}

function includes(contentType: string, marker: string): boolean {
    return contentType.toLowerCase().includes(marker);
}

const TEXT_BODY_RULES: TextBodyRule[] = [
    {
        matches: contentType => includes(contentType, MEDIA_TYPE_NAMES.MultipartFormData),
        build: (text, contentType) => bodyOf(CLIENT_BODY_TYPE.Multipart, {
            multipartRows: (MultipartText.parse(text, contentType) ?? []).map(rowOf),
        }),
    },
    {
        matches: (contentType, text) => includes(contentType, MEDIA_TYPE_NAMES.ApplicationFormUrlEncoded)
            && !isJsonDocument(text),
        build: text => bodyOf(CLIENT_BODY_TYPE.FormUrlEncoded, {
            formRows: [...new URLSearchParams(text).entries()].map(([name, value]) => ({
                name,
                value,
            })),
        }),
    },
    {
        matches: contentType => includes(contentType, MEDIA_TYPES.ApplicationGraphQl),
        build: text => bodyOf(CLIENT_BODY_TYPE.GraphQl, {
            graphQlQuery: text,
        }),
    },
    {
        matches: (contentType, text) => (contentType === '' || includes(contentType, MEDIA_TYPES.JsonMarker))
            && graphQlQueryOf(text) != null,
        build: text => bodyOf(CLIENT_BODY_TYPE.GraphQl, {
            graphQlQuery: graphQlQueryOf(text) ?? '',
        }),
    },
    {
        matches: (contentType, text) => includes(contentType, MEDIA_TYPES.JsonMarker) || isJsonDocument(text),
        build: text => bodyOf(CLIENT_BODY_TYPE.Json, {
            text,
        }),
    },
    {
        matches: (contentType, text) => includes(contentType, XML_MARKER)
            || (contentType === '' && text.trimStart().startsWith(XML_START)),
        build: text => bodyOf(CLIENT_BODY_TYPE.Xml, {
            text,
        }),
    },
];

const PLAIN_TEXT_BODY_RULE: TextBodyRule = {
    matches: () => true,
    build: text => bodyOf(CLIENT_BODY_TYPE.Text, {
        text,
    }),
};

type ClientBodyBuilders = {
    [TKind in SnippetBody['kind']]: (
        body: Extract<SnippetBody, { kind: TKind }>,
        contentType: string,
    ) => ClientBody;
};

type ClientBodyBuilder = (body: SnippetBody, contentType: string) => ClientBody;

const CLIENT_BODY_BUILDERS: ClientBodyBuilders = {
    [SNIPPET_BODY_KIND.None]: () => ClientBodies.empty(),
    [SNIPPET_BODY_KIND.File]: body => bodyOf(CLIENT_BODY_TYPE.Binary, {
        fileName: body.fileName,
    }),
    [SNIPPET_BODY_KIND.Multipart]: body => bodyOf(CLIENT_BODY_TYPE.Multipart, {
        multipartRows: body.parts.map(rowOf),
    }),
    [SNIPPET_BODY_KIND.Text]: (body, contentType) => {
        const rule = TEXT_BODY_RULES.find(candidate => candidate.matches(contentType, body.text))
            ?? PLAIN_TEXT_BODY_RULE;

        return rule.build(body.text, contentType);
    },
};

function clientBodyOf(body: SnippetBody, contentType: string): ClientBody {
    const build = CLIENT_BODY_BUILDERS[body.kind] as ClientBodyBuilder;

    return build(body, contentType);
}

function keepsContentType(body: ClientBody, contentType: string): boolean {
    const isMultipart = body.type === CLIENT_BODY_TYPE.Multipart;
    const isJsonSentAsForm = body.type === CLIENT_BODY_TYPE.Json
        && includes(contentType, MEDIA_TYPE_NAMES.ApplicationFormUrlEncoded);

    return !isMultipart && !isJsonSentAsForm;
}

interface HeadersOfOptions {
    snippet: RequestSnippet;
    body: ClientBody;
    contentType: string;
}

function headersOf({ snippet, body, contentType }: HeadersOfOptions): HeaderEntry[] {
    const headers = SnippetHeaders.sendable(snippet.headers);
    const kept = keepsContentType(body, contentType)
        ? headers
        : SnippetHeaders.without(headers, [HEADER_NAMES.ContentType]);
    if (snippet.cookies.length === 0) {
        return kept;
    }

    return [
        ...kept,
        {
            name: HEADER_NAMES.Cookie,
            value: CookieHeader.serialize(snippet.cookies),
        },
    ];
}

export const ClientRequestDraft = {
    fromSnippet(snippet: RequestSnippet): ClientRequest {
        const contentTypeHeader = SnippetHeaders.find(snippet.headers, HEADER_NAMES.ContentType);
        const contentType = contentTypeHeader?.value ?? '';
        const body = clientBodyOf(snippet.body, contentType);

        return {
            method: snippet.method,
            url: snippet.url,
            headers: headersOf({ snippet, body, contentType }),
            body,
        };
    },
};
