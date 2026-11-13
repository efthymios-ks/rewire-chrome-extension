import type { TimelineAnnotation } from "../../../Contracts/Timeline/TimelineAnnotation";
import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";
import type { ITimelineStore, RecordChange } from "./ITimelineStore";
import { TimelineAnnotations } from "./TimelineAnnotations";
import { TimelineLimits } from "./TimelineLimits";
import type { TimelineRecord } from "./TimelineRecord";

function deferredKeyOf(tabId: number, entryId: string): string {
    return `${tabId}:${entryId}`;
}

function trimOldest<TValue>(map: Map<string, TValue>, maxSize: number): void {
    while (map.size > maxSize) {
        const oldestKey = map
            .keys()
            .next()
            .value;
        if (oldestKey === undefined) {
            return;
        }

        map.delete(oldestKey);
    }
}

export class TimelineStore implements ITimelineStore {
    private readonly _recordsByTab = new Map<number, Map<string, TimelineRecord>>();
    private readonly _deferredChanges = new Map<string, RecordChange[]>();
    private readonly _listeners: Array<(summary: TimelineEntrySummary) => void> = [];

    get(tabId: number, entryId: string): TimelineRecord | undefined {
        return this._recordsByTab.get(tabId)?.get(entryId);
    }

    list(tabId: number): TimelineEntrySummary[] {
        return this.records(tabId).map(record => record.summary);
    }

    records(tabId: number): TimelineRecord[] {
        const records = this._recordsByTab.get(tabId);

        return records === undefined ? [] : [...records.values()];
    }

    add(record: TimelineRecord): void {
        const { tabId, id } = record.summary;
        const deferredKey = deferredKeyOf(tabId, id);
        const deferred = this._deferredChanges.get(deferredKey) ?? [];
        this._deferredChanges.delete(deferredKey);

        const stored = deferred.reduce((current, change) => change(current), record);
        const records = this.recordsOf(tabId);
        records.set(id, stored);
        trimOldest(records, TimelineLimits.MaxEntriesPerTab);
        this.publish(stored.summary);
    }

    update(
        tabId: number,
        entryId: string,
        change: RecordChange
    ): void {
        const records = this._recordsByTab.get(tabId);
        const record = records?.get(entryId);
        if (records === undefined || record === undefined) {
            return;
        }

        const updated = change(record);
        records.set(entryId, updated);
        this.publish(updated.summary);
    }

    updateOrDefer(
        tabId: number,
        entryId: string,
        change: RecordChange
    ): void {
        if (this.get(tabId, entryId) !== undefined) {
            this.update(
                tabId,
                entryId,
                change
            );

            return;
        }

        const deferredKey = deferredKeyOf(tabId, entryId);
        this._deferredChanges.set(deferredKey, [
            ...(this._deferredChanges.get(deferredKey) ?? []),
            change,
        ]);
        trimOldest(this._deferredChanges, TimelineLimits.MaxPendingInterceptions);
    }

    annotate(
        tabId: number,
        entryId: string,
        annotation: TimelineAnnotation
    ): void {
        this.updateOrDefer(
            tabId,
            entryId,
            record => TimelineAnnotations.applyTo(record, annotation)
        );
    }

    addLeg(
        tabId: number,
        baseId: string,
        make: (legId: string) => TimelineRecord
    ): void {
        const records = this._recordsByTab.get(tabId);
        const legPrefix = `${baseId}-leg-`;
        const legCount = records === undefined ? 0 : [...records.keys()].filter(id => id.startsWith(legPrefix)).length;
        this.add(make(`${legPrefix}${legCount + 1}`));
    }

    remove(tabId: number, entryId: string): void {
        this._recordsByTab.get(tabId)?.delete(entryId);
        this._deferredChanges.delete(deferredKeyOf(tabId, entryId));
    }

    clear(tabId: number): void {
        this._recordsByTab.delete(tabId);
    }

    subscribe(listener: (summary: TimelineEntrySummary) => void): void {
        this._listeners.push(listener);
    }

    private recordsOf(tabId: number): Map<string, TimelineRecord> {
        const existing = this._recordsByTab.get(tabId);
        if (existing !== undefined) {
            return existing;
        }

        const created = new Map<string, TimelineRecord>();
        this._recordsByTab.set(tabId, created);

        return created;
    }

    private publish(summary: TimelineEntrySummary): void {
        this._listeners.forEach(listener => listener(summary));
    }
}
