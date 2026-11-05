import type { IBrowserRuleSimulator } from "./BrowserRuleSimulator";
import type { ITimelineStore } from "./ITimelineStore";
import type { TimelineRecord } from "./TimelineRecord";

export interface ITimelineAdmission {
    admit(record: TimelineRecord): void;
}

export class TimelineAdmission implements ITimelineAdmission {
    private readonly _timelineStore: ITimelineStore;
    private readonly _browserRuleSimulator: IBrowserRuleSimulator;

    constructor(timelineStore: ITimelineStore, browserRuleSimulator: IBrowserRuleSimulator) {
        this._timelineStore = timelineStore;
        this._browserRuleSimulator = browserRuleSimulator;
    }

    admit(record: TimelineRecord): void {
        this._timelineStore.add(record);

        const annotation = this._browserRuleSimulator.onRequest(record);
        if (annotation === null) {
            return;
        }

        this._timelineStore.annotate(
            record.summary.tabId,
            record.summary.id,
            annotation
        );
    }
}
