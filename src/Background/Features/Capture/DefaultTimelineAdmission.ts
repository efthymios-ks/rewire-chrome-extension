import type { BrowserRuleSimulator } from './BrowserRuleSimulator';
import type { TimelineAdmission } from './TimelineAdmission';
import type { TimelineRecord } from './TimelineRecord';
import type { TimelineStore } from './TimelineStore';

export class DefaultTimelineAdmission implements TimelineAdmission {
    private readonly _timelineStore: TimelineStore;
    private readonly _browserRuleSimulator: BrowserRuleSimulator;

    constructor(timelineStore: TimelineStore, browserRuleSimulator: BrowserRuleSimulator) {
        this._timelineStore = timelineStore;
        this._browserRuleSimulator = browserRuleSimulator;
    }

    admit(record: TimelineRecord): void {
        this._timelineStore.add(record);

        const annotation = this._browserRuleSimulator.simulateRequest(record);
        if (annotation == null) {
            return;
        }

        this._timelineStore.annotate({ tabId: record.summary.tabId, entryId: record.summary.id, annotation });
    }
}
