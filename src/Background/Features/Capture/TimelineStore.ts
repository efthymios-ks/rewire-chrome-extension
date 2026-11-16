import type { TimelineAnnotation } from '../../../Contracts/Timeline/TimelineAnnotation';
import type { TimelineEntrySummary } from '../../../Contracts/Timeline/TimelineEntrySummary';
import type { RecordChange } from './RecordChange';
import type { TimelineRecord } from './TimelineRecord';

export interface UpdateOptions {
    tabId: number;
    entryId: string;
    change: RecordChange;
}

export interface UpdateOrDeferOptions {
    tabId: number;
    entryId: string;
    change: RecordChange;
}

export interface AnnotateOptions {
    tabId: number;
    entryId: string;
    annotation: TimelineAnnotation;
}

export interface AddLegOptions {
    tabId: number;
    baseId: string;
    make: (legId: string) => TimelineRecord;
}

export interface TimelineStore {
    get(tabId: number, entryId: string): TimelineRecord | undefined;
    list(tabId: number): TimelineEntrySummary[];
    records(tabId: number): TimelineRecord[];
    add(record: TimelineRecord): void;
    update(options: UpdateOptions): void;
    updateOrDefer(options: UpdateOrDeferOptions): void;
    annotate(options: AnnotateOptions): void;
    addLeg(options: AddLegOptions): void;
    remove(tabId: number, entryId: string): void;
    clear(tabId: number): void;
    subscribe(listener: (summary: TimelineEntrySummary) => void): void;
}
