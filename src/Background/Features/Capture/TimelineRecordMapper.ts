import { DraftChanges } from "../../../Common/Rules/Drafts/DraftChanges";
import type { ResponseDraft } from "../../../Common/Rules/Drafts/Drafts";
import { RuleEngine } from "../../../Contracts/Rules/RuleEngine";
import { ChangeArea, type ValueChange } from "../../../Contracts/Rules/ValueChange";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";
import { RecordedChanges } from "./RecordedChanges";
import type { TimelineRecord } from "./TimelineRecord";

const WireOnlyResponseHeaders = [
    "set-cookie",
    "set-cookie2",
];
const PseudoHeaderPrefix = ":";

function nameOf(header: HeaderEntry): string {
    return header.name.toLowerCase();
}

function isComparable(header: HeaderEntry): boolean {
    const name = nameOf(header);

    return !name.startsWith(PseudoHeaderPrefix) && !WireOnlyResponseHeaders.includes(name);
}

function responseDraftOf(status: number, headers: HeaderEntry[]): ResponseDraft {
    return {
        status,
        headers,
        body: null,
        errorReason: null,
    };
}

function responseHeadersOf(record: TimelineRecord): HeaderEntry[] {
    if (record.rawResponseHeaders === null) {
        return record.responseHeaders;
    }

    const pageNames = new Set(record.responseHeaders.map(nameOf));
    const wireOnly = record.rawResponseHeaders.filter(header => WireOnlyResponseHeaders.includes(nameOf(header)) && !pageNames.has(nameOf(header)));

    return [
        ...record.responseHeaders,
        ...wireOnly,
    ];
}

function browserResponseChangesOf(record: TimelineRecord): ValueChange[] {
    const ranBrowserRules = record.summary.appliedRules.some(applied => applied.engine === RuleEngine.Browser);
    if (record.rawResponseHeaders === null || !ranBrowserRules) {
        return [];
    }

    const status = record.summary.statusCode ?? 0;
    const known = new Set(record.changes
        .filter(change => change.area === ChangeArea.ResponseHeader)
        .map(change => change.name));

    return DraftChanges
        .ofResponse(
            responseDraftOf(status, record.rawResponseHeaders.filter(isComparable)),
            responseDraftOf(status, record.responseHeaders.filter(isComparable))
        )
        .filter(change => change.area === ChangeArea.ResponseHeader && !known.has(change.name));
}

export const TimelineRecordMapper = {
    toDetail(record: TimelineRecord): TimelineEntryDetail {
        return RecordedChanges.applyTo({
            summary: record.summary,
            requestHeaders: record.rawRequestHeaders ?? record.requestHeaders,
            requestBody: record.requestBody,
            responseHeaders: responseHeadersOf(record),
            responseBody: record.responseBody,
            responseBodyNote: record.responseBodyNote,
            changes: [
                ...record.changes,
                ...browserResponseChangesOf(record),
            ],
        });
    },
};
