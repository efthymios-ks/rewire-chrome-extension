import type { IRequestSnippet } from "../../../Common/CodeGen/IRequestSnippet";
import { type MultipartPart, type SnippetBody, SnippetBodyKind } from "../../../Common/CodeGen/SnippetBody";
import { SnippetHeaderNames, SnippetHeaders } from "../../../Common/CodeGen/SnippetHeaders";
import { MultipartText } from "../../../Common/Http/MultipartText";
import { JsonText } from "../../../Common/Json/JsonText";
import { CookieHeader } from "../../../Common/Rules/Http/CookieHeader";
import { MediaTypeNames } from "../../../Contracts/Http/MediaTypeNames";
import { MediaTypes } from "../../../Contracts/Http/MediaTypes";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import { ClientBodies } from "./ClientBodies";
import { type ClientBody, ClientBodyType, type ClientRequest, type MultipartRow } from "./ClientRequest";

const CookieHeaderName = "Cookie";
const GraphQlQueryKey = "query";
const XmlMarker = "xml";
const XmlStart = "<";

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
    const isFile = part.fileName !== null;

    return {
        name: part.name,
        value: isFile ? "" : part.value,
        isFile,
        file: null,
        fileName: part.fileName ?? "",
    };
}

function graphQlQueryOf(text: string): string | null {
    const parsed = JsonText.tryParse(text);
    if (parsed.hasErrors || typeof parsed.value !== "object" || parsed.value === null || Array.isArray(parsed.value)) {
        return null;
    }

    const record = parsed.value as Record<string, unknown>;
    const query = record[GraphQlQueryKey];
    const keys = Object.keys(record);

    return typeof query === "string" && keys.length === 1 ? query : null;
}

function isJsonDocument(text: string): boolean {
    const parsed = JsonText.tryParse(text);

    return !parsed.hasErrors && typeof parsed.value === "object" && parsed.value !== null;
}

function includes(contentType: string, marker: string): boolean {
    return contentType.toLowerCase().includes(marker);
}

const TextBodyRules: TextBodyRule[] = [
    {
        matches: contentType => includes(contentType, MediaTypeNames.MultipartFormData),
        build: (text, contentType) => bodyOf(ClientBodyType.Multipart, {
            multipartRows: (MultipartText.parse(text, contentType) ?? []).map(rowOf),
        }),
    },
    {
        matches: (contentType, text) => includes(contentType, MediaTypeNames.ApplicationFormUrlEncoded) && !isJsonDocument(text),
        build: text => bodyOf(ClientBodyType.FormUrlEncoded, {
            formRows: [...new URLSearchParams(text).entries()].map(([name, value]) => ({
                name,
                value,
            })),
        }),
    },
    {
        matches: contentType => includes(contentType, MediaTypes.ApplicationGraphQl),
        build: text => bodyOf(ClientBodyType.GraphQl, {
            graphQlQuery: text,
        }),
    },
    {
        matches: (contentType, text) => (contentType === "" || includes(contentType, MediaTypes.JsonMarker)) && graphQlQueryOf(text) !== null,
        build: text => bodyOf(ClientBodyType.GraphQl, {
            graphQlQuery: graphQlQueryOf(text) ?? "",
        }),
    },
    {
        matches: (contentType, text) => includes(contentType, MediaTypes.JsonMarker) || isJsonDocument(text),
        build: text => bodyOf(ClientBodyType.Json, {
            text,
        }),
    },
    {
        matches: (contentType, text) => includes(contentType, XmlMarker) || (contentType === "" && text.trimStart().startsWith(XmlStart)),
        build: text => bodyOf(ClientBodyType.Xml, {
            text,
        }),
    },
    {
        matches: () => true,
        build: text => bodyOf(ClientBodyType.Text, {
            text,
        }),
    },
];

function clientBodyOf(body: SnippetBody, contentType: string): ClientBody {
    switch (body.kind) {
        case SnippetBodyKind.None:
            return ClientBodies.empty();
        case SnippetBodyKind.File:
            return bodyOf(ClientBodyType.Binary, {
                fileName: body.fileName,
            });
        case SnippetBodyKind.Multipart:
            return bodyOf(ClientBodyType.Multipart, {
                multipartRows: body.parts.map(rowOf),
            });
        case SnippetBodyKind.Text:
            return TextBodyRules
                .find(rule => rule.matches(contentType, body.text))!
                .build(body.text, contentType);
    }
}

function keepsContentType(body: ClientBody, contentType: string): boolean {
    const isMultipart = body.type === ClientBodyType.Multipart;
    const isJsonSentAsForm = body.type === ClientBodyType.Json && includes(contentType, MediaTypeNames.ApplicationFormUrlEncoded);

    return !isMultipart && !isJsonSentAsForm;
}

function headersOf(
    snippet: IRequestSnippet,
    body: ClientBody,
    contentType: string
): HeaderEntry[] {
    const headers = SnippetHeaders.sendable(snippet.headers);
    const kept = keepsContentType(body, contentType)
        ? headers
        : SnippetHeaders.without(headers, [SnippetHeaderNames.ContentType]);
    if (snippet.cookies.length === 0) {
        return kept;
    }

    return [
        ...kept,
        {
            name: CookieHeaderName,
            value: CookieHeader.serialize(snippet.cookies),
        },
    ];
}

export const ClientRequestDraft = {
    fromSnippet(snippet: IRequestSnippet): ClientRequest {
        const contentType = SnippetHeaders.find(snippet.headers, SnippetHeaderNames.ContentType)?.value ?? "";
        const body = clientBodyOf(snippet.body, contentType);

        return {
            method: snippet.method,
            url: snippet.url,
            headers: headersOf(
                snippet,
                body,
                contentType
            ),
            body,
        };
    },
};
