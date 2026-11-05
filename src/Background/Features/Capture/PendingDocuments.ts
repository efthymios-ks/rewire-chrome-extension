import type { RecordChange } from "./ITimelineStore";
import { TimelineLimits } from "./TimelineLimits";
import type { TimelineRecord } from "./TimelineRecord";

export interface IPendingDocuments {
    hold(record: TimelineRecord): void;
    has(tabId: number, entryId: string): boolean;
    get(tabId: number, entryId: string): TimelineRecord | undefined;
    update(
        tabId: number,
        entryId: string,
        change: RecordChange
    ): void;
    take(tabId: number, entryId: string): TimelineRecord | undefined;
}

function keyOf(tabId: number, entryId: string): string {
    return `${tabId}:${entryId}`;
}

export class PendingDocuments implements IPendingDocuments {
    private readonly _records = new Map<string, TimelineRecord>();

    hold(record: TimelineRecord): void {
        this._records.set(keyOf(record.summary.tabId, record.summary.id), record);
        while (this._records.size > TimelineLimits.MaxPendingDocuments) {
            const oldestKey = this._records
                .keys()
                .next()
                .value;
            if (oldestKey === undefined) {
                return;
            }

            this._records.delete(oldestKey);
        }
    }

    has(tabId: number, entryId: string): boolean {
        return this._records.has(keyOf(tabId, entryId));
    }

    get(tabId: number, entryId: string): TimelineRecord | undefined {
        return this._records.get(keyOf(tabId, entryId));
    }

    update(
        tabId: number,
        entryId: string,
        change: RecordChange
    ): void {
        const key = keyOf(tabId, entryId);
        const record = this._records.get(key);
        if (record === undefined) {
            return;
        }

        this._records.set(key, change(record));
    }

    take(tabId: number, entryId: string): TimelineRecord | undefined {
        const key = keyOf(tabId, entryId);
        const record = this._records.get(key);
        this._records.delete(key);

        return record;
    }
}
