import type { ValueChange } from "../Rules/ValueChange";
import type { HeaderEntry } from "./HeaderEntry";
import type { TimelineEntrySummary } from "./TimelineEntrySummary";

export interface TimelineEntryDetail {
    summary: TimelineEntrySummary;
    requestHeaders: HeaderEntry[];
    requestBody: string | null;
    responseHeaders: HeaderEntry[];
    responseBody: string | null;
    responseBodyNote: string | null;
    changes: ValueChange[];
}
