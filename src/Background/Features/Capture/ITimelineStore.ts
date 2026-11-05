import type { TimelineAnnotation } from "../../../Contracts/Timeline/TimelineAnnotation";
import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";
import type { TimelineRecord } from "./TimelineRecord";

export type RecordChange = (record: TimelineRecord) => TimelineRecord;

export interface ITimelineStore {
    get(tabId: number, entryId: string): TimelineRecord | undefined;
    list(tabId: number): TimelineEntrySummary[];
    records(tabId: number): TimelineRecord[];
    add(record: TimelineRecord): void;
    update(
        tabId: number,
        entryId: string,
        change: RecordChange
    ): void;
    updateOrDefer(
        tabId: number,
        entryId: string,
        change: RecordChange
    ): void;
    annotate(
        tabId: number,
        entryId: string,
        annotation: TimelineAnnotation
    ): void;
    addLeg(
        tabId: number,
        baseId: string,
        make: (legId: string) => TimelineRecord
    ): void;
    clear(tabId: number): void;
    subscribe(listener: (summary: TimelineEntrySummary) => void): void;
}
