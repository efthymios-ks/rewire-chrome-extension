import type { ValueChange } from '../Rules/ValueChange';
import type { HeaderEntry } from './HeaderEntry';
import type { TimelineEntrySummary } from './TimelineEntrySummary';

export interface TimelineEntryDetail {
    summary: TimelineEntrySummary;
    requestHeaders: HeaderEntry[];
    requestBody: string | null;
    requestBodyNote: string | null;
    requestBodyBase64: string | null;
    requestBodyByteSize: number | null;
    responseHeaders: HeaderEntry[];
    responseBody: string | null;
    responseBodyNote: string | null;
    changes: ValueChange[];
}
