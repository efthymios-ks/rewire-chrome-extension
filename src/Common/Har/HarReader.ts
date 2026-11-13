import type { IContentKindClassifier } from "../Content/ContentKindClassifier";
import { Base64Text } from "../Encoding/Base64Text";
import { HeaderLookup } from "../Http/HeaderLookup";
import { TextualMime } from "../Http/TextualMime";
import { JsonText } from "../Json/JsonText";
import { Result } from "../Results/Result";
import { EndpointKey } from "../Urls/EndpointKey";
import { SafeUrl } from "../Urls/SafeUrl";
import type { HeaderEntry } from "../../Contracts/Timeline/HeaderEntry";
import type { TimelineEntryDetail } from "../../Contracts/Timeline/TimelineEntryDetail";
import { TimelineEntryState } from "../../Contracts/Timeline/TimelineEntryState";

type RawRecord = Record<string, unknown>;

export const HarTabId = -1;

const EntryIdPrefix = "har-";
const Base64Encoding = "base64";
const ContentTypeHeader = "Content-Type";
const MimeParameterSeparator = ";";
const FailedStatus = 0;
const OtherResourceType = "Other";
const ResourceTypeNames: Record<string, string> = {
    xhr: "XHR",
    eventsource: "EventSource",
    websocket: "WebSocket",
    cspviolationreport: "CSPViolationReport",
    signedexchange: "SignedExchange",
    texttrack: "TextTrack",
};

function isRecord(value: unknown): value is RawRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordOf(record: RawRecord, key: string): RawRecord {
    const value = record[key];

    return isRecord(value) ? value : {};
}

function textOf(record: RawRecord, key: string): string {
    const value = record[key];

    return typeof value === "string" ? value : "";
}

function numberOf(record: RawRecord, key: string): number | null {
    const value = record[key];

    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function headersOf(record: RawRecord): HeaderEntry[] {
    const value = record["headers"];
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter(isRecord)
        .map(header => ({
            name: textOf(header, "name"),
            value: textOf(header, "value"),
        }))
        .filter(header => header.name !== "");
}

function resourceTypeOf(entry: RawRecord): string {
    const raw = textOf(entry, "_resourceType").toLowerCase();
    if (raw === "") {
        return OtherResourceType;
    }

    return ResourceTypeNames[raw] ?? `${raw.charAt(0).toUpperCase()}${raw.slice(1)}`;
}

function requestBodyOf(request: RawRecord): string | null {
    const postData = recordOf(request, "postData");
    if (typeof postData["text"] === "string") {
        return postData["text"];
    }

    const params = postData["params"];
    if (!Array.isArray(params)) {
        return null;
    }

    return new URLSearchParams(params
        .filter(isRecord)
        .map(param => [
            textOf(param, "name"),
            textOf(param, "value"),
        ])).toString();
}

function decodedBase64(text: string, mimeType: string): string | null {
    if (!TextualMime.isTextual(mimeType)) {
        return null;
    }

    try {
        return Base64Text.toUtf8(text);
    } catch {
        return null;
    }
}

function responseBodyOf(content: RawRecord, mimeType: string): { body: string | null; note: string | null } {
    const text = content["text"];
    if (typeof text !== "string") {
        const comment = textOf(content, "comment");

        return {
            body: null,
            note: comment === "" ? null : comment,
        };
    }

    if (textOf(content, "encoding") !== Base64Encoding) {
        return {
            body: text,
            note: null,
        };
    }

    const decoded = decodedBase64(text, mimeType);

    return decoded === null
        ? {
            body: null,
            note: `Binary body (${numberOf(content, "size") ?? 0} bytes), not shown.`,
        }
        : {
            body: decoded,
            note: null,
        };
}

function mimeTypeOf(content: RawRecord, headers: HeaderEntry[]): string {
    const declared = textOf(content, "mimeType") || (HeaderLookup.find(headers, ContentTypeHeader) ?? "");

    return declared.split(MimeParameterSeparator)[0]?.trim() ?? "";
}

function detailOf(
    entry: RawRecord,
    index: number,
    classifier: IContentKindClassifier
): TimelineEntryDetail | null {
    const request = recordOf(entry, "request");
    const response = recordOf(entry, "response");
    const url = textOf(request, "url");
    const parsed = SafeUrl.parse(url);
    if (parsed === null) {
        return null;
    }

    const method = (textOf(request, "method") || "GET").toUpperCase();
    const requestHeaders = headersOf(request);
    const responseHeaders = headersOf(response);
    const content = recordOf(response, "content");
    const mimeType = mimeTypeOf(content, responseHeaders);
    const requestBody = requestBodyOf(request);
    const responseBody = responseBodyOf(content, mimeType);
    const status = numberOf(response, "status") ?? FailedStatus;
    const error = textOf(entry, "_error") || textOf(response, "_error");
    const hasFailed = status === FailedStatus || error !== "";
    const time = numberOf(entry, "time");

    return {
        summary: {
            id: `${EntryIdPrefix}${index + 1}`,
            tabId: HarTabId,
            method,
            url,
            host: parsed.hostname,
            path: `${parsed.pathname}${parsed.search}`,
            endpointKey: EndpointKey.create(method, url),
            resourceType: resourceTypeOf(entry),
            contentKind: classifier.classify({
                url,
                requestContentType: HeaderLookup.find(requestHeaders, ContentTypeHeader) ?? "",
                responseMimeType: mimeType,
                requestBody,
            }),
            state: hasFailed ? TimelineEntryState.Failed : TimelineEntryState.Completed,
            statusCode: hasFailed ? null : status,
            statusText: textOf(response, "statusText"),
            mimeType,
            startedAt: textOf(entry, "startedDateTime"),
            durationInMilliseconds: time === null || time < 0 ? null : Math.round(time),
            appliedRules: [],
            isAnsweredByRule: false,
            redirectedFromUrl: null,
            errorText: hasFailed ? error || "Failed" : null,
            frame: null,
        },
        requestHeaders,
        requestBody,
        responseHeaders,
        responseBody: responseBody.body,
        responseBodyNote: responseBody.note,
        changes: [],
    };
}

function startOf(detail: TimelineEntryDetail): number {
    const start = Date.parse(detail.summary.startedAt);

    return Number.isNaN(start) ? 0 : start;
}

export const HarReader = {
    read(text: string, classifier: IContentKindClassifier): Result<TimelineEntryDetail[]> {
        const parsed = JsonText.tryParse(text);
        if (parsed.hasErrors) {
            return Result.fail("it isn't valid JSON");
        }

        const log = isRecord(parsed.value) ? recordOf(parsed.value, "log") : {};
        const entries = log["entries"];
        if (!Array.isArray(entries)) {
            return Result.fail("it has no log.entries list");
        }

        return Result.ok(entries
            .filter(isRecord)
            .map((entry, index) => detailOf(
                entry,
                index,
                classifier
            ))
            .filter((detail): detail is TimelineEntryDetail => detail !== null)
            .sort((left, right) => startOf(left) - startOf(right)));
    },
};
