import { getOrCreate } from '../../../Common/Collections/getOrCreate';
import type { TimelineEntrySummary } from '../../../Contracts/Timeline/TimelineEntrySummary';
import { BoundedMap } from '../../Core/BoundedMap';
import { TabScopedKey } from '../../Core/TabScopedKey';
import type { RecordChange } from './RecordChange';
import type {
    AddLegOptions,
    AnnotateOptions,
    TimelineStore,
    UpdateOptions,
    UpdateOrDeferOptions,
} from './TimelineStore';
import { TimelineAnnotations } from './TimelineAnnotations';
import { TIMELINE_LIMITS } from './TimelineLimits';
import type { TimelineRecord } from './TimelineRecord';

export class DefaultTimelineStore implements TimelineStore {
    private readonly _recordsByTab = new Map<number, Map<string, TimelineRecord>>();
    private readonly _deferredChanges = new BoundedMap<string, RecordChange[]>(
        /* maxSize: */ TIMELINE_LIMITS.MaxDeferredChanges,
    );
    private readonly _listeners: Array<(summary: TimelineEntrySummary) => void> = [];

    get(tabId: number, entryId: string): TimelineRecord | undefined {
        return this._recordsByTab.get(tabId)?.get(entryId);
    }

    list(tabId: number): TimelineEntrySummary[] {
        return this.records(tabId).map(record => record.summary);
    }

    records(tabId: number): TimelineRecord[] {
        const records = this._recordsByTab.get(tabId);

        return records == null ? [] : [...records.values()];
    }

    add(record: TimelineRecord): void {
        const { tabId, id } = record.summary;
        const deferredKey = TabScopedKey.of(tabId, id);
        const deferred = this._deferredChanges.get(deferredKey) ?? [];
        this._deferredChanges.delete(deferredKey);

        const stored = deferred.reduce((current, change) => change(current), record);
        this.recordsOf(tabId).set(id, stored);
        this.publish(stored.summary);
    }

    update({ tabId, entryId, change }: UpdateOptions): void {
        const records = this._recordsByTab.get(tabId);
        const record = records?.get(entryId);
        if (records == null || record == null) {
            return;
        }

        const updated = change(record);
        records.set(entryId, updated);
        this.publish(updated.summary);
    }

    updateOrDefer({ tabId, entryId, change }: UpdateOrDeferOptions): void {
        if (this.get(tabId, entryId) != null) {
            this.update({ tabId, entryId, change });

            return;
        }

        const deferredKey = TabScopedKey.of(tabId, entryId);
        this._deferredChanges.set(deferredKey, [
            ...(this._deferredChanges.get(deferredKey) ?? []),
            change,
        ]);
    }

    annotate({ tabId, entryId, annotation }: AnnotateOptions): void {
        this.updateOrDefer({
            tabId,
            entryId,
            change: record => TimelineAnnotations.applyTo(record, annotation),
        });
    }

    addLeg({ tabId, baseId, make }: AddLegOptions): void {
        const records = this._recordsByTab.get(tabId);
        const legPrefix = `${baseId}-leg-`;
        const legCount = records == null
            ? 0
            : [...records.keys()]
                .filter(id => id.startsWith(legPrefix))
                .length;
        this.add(make(`${legPrefix}${legCount + 1}`));
    }

    remove(tabId: number, entryId: string): void {
        this._recordsByTab.get(tabId)?.delete(entryId);
        this._deferredChanges.delete(TabScopedKey.of(tabId, entryId));
    }

    clear(tabId: number): void {
        this._recordsByTab.delete(tabId);
    }

    subscribe(listener: (summary: TimelineEntrySummary) => void): void {
        this._listeners.push(listener);
    }

    private recordsOf(tabId: number): Map<string, TimelineRecord> {
        return getOrCreate({
            map: this._recordsByTab,
            key: tabId,
            create: () => new BoundedMap<string, TimelineRecord>(TIMELINE_LIMITS.MaxEntriesPerTab),
        });
    }

    private publish(summary: TimelineEntrySummary): void {
        this._listeners.forEach(listener => listener(summary));
    }
}
