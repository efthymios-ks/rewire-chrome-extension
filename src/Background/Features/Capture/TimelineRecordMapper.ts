import { DraftChanges } from '../../../Common/Rules/Drafts/DraftChanges';
import { responseDraftOf } from '../../../Common/Rules/Drafts/responseDraftOf';
import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { RULE_ENGINE } from '../../../Contracts/Rules/RuleEngine';
import type { ValueChange } from '../../../Contracts/Rules/ValueChange';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';
import { RecordedChanges } from './RecordedChanges';
import type { TimelineRecord } from './TimelineRecord';

const WIRE_ONLY_RESPONSE_HEADERS = [
    'set-cookie',
    'set-cookie2',
];
const PSEUDO_HEADER_PREFIX = ':';

function nameOf(header: HeaderEntry): string {
    return header.name.toLowerCase();
}

function isComparable(header: HeaderEntry): boolean {
    const name = nameOf(header);

    return !name.startsWith(PSEUDO_HEADER_PREFIX) && !WIRE_ONLY_RESPONSE_HEADERS.includes(name);
}

function responseHeadersOf(record: TimelineRecord): HeaderEntry[] {
    if (record.rawResponseHeaders == null) {
        return record.responseHeaders;
    }

    const pageNames = new Set(record.responseHeaders.map(nameOf));
    const wireOnly = record.rawResponseHeaders
        .filter(header => WIRE_ONLY_RESPONSE_HEADERS.includes(nameOf(header)))
        .filter(header => !pageNames.has(nameOf(header)));

    return [
        ...record.responseHeaders,
        ...wireOnly,
    ];
}

function browserResponseChangesOf(record: TimelineRecord): ValueChange[] {
    const hasRunBrowserRules = record.summary.appliedRules
        .some(applied => applied.engine === RULE_ENGINE.Browser);
    if (record.rawResponseHeaders == null || !hasRunBrowserRules) {
        return [];
    }

    const status = record.summary.statusCode ?? 0;
    const known = new Set(record.changes
        .filter(change => change.area === CHANGE_AREA.ResponseHeader)
        .map(change => change.name));

    return DraftChanges
        .ofResponse(
            /* before: */ responseDraftOf(
                /* status: */ status,
                /* headers: */ record.rawResponseHeaders.filter(isComparable),
            ),
            /* after: */ responseDraftOf(
                /* status: */ status,
                /* headers: */ record.responseHeaders.filter(isComparable),
            ),
        )
        .filter(change => change.area === CHANGE_AREA.ResponseHeader && !known.has(change.name));
}

export const TimelineRecordMapper = {
    toDetail(record: TimelineRecord): TimelineEntryDetail {
        return RecordedChanges.applyTo({
            summary: record.summary,
            requestHeaders: record.rawRequestHeaders ?? record.requestHeaders,
            requestBody: record.requestBody,
            requestBodyNote: record.requestBodyNote,
            requestBodyBase64: record.requestBodyBase64,
            requestBodyByteSize: record.requestBodyByteSize,
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
