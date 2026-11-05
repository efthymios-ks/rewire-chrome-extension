import type { ValueChange } from "../../../Contracts/Rules/ValueChange";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";

export interface TimelineRecord {
    summary: TimelineEntrySummary;
    requestHeaders: HeaderEntry[];
    rawRequestHeaders: HeaderEntry[] | null;
    requestContentType: string;
    requestBody: string | null;
    responseHeaders: HeaderEntry[];
    rawResponseHeaders: HeaderEntry[] | null;
    responseBody: string | null;
    responseBodyNote: string | null;
    changes: ValueChange[];
    startedTimestamp: number;
}
