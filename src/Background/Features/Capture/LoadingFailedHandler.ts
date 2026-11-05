import type { Protocol } from "devtools-protocol";
import { TimelineEntryState } from "../../../Contracts/Timeline/TimelineEntryState";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { IBrowserRuleSimulator } from "./BrowserRuleSimulator";
import { Durations } from "./Durations";
import type { ITimelineStore } from "./ITimelineStore";
import type { IPendingDocuments } from "./PendingDocuments";
import { TimelineAnnotations } from "./TimelineAnnotations";
import type { ITimelineAdmission } from "./TimelineAdmission";
import type { TimelineRecord } from "./TimelineRecord";

const CanceledErrorText = "Canceled";

export interface LoadingFailedDependencies {
    timelineStore: ITimelineStore;
    pendingDocuments: IPendingDocuments;
    admission: ITimelineAdmission;
    browserRuleSimulator: IBrowserRuleSimulator;
}

function failed(
    record: TimelineRecord,
    errorText: string,
    endedTimestamp: number
): TimelineRecord {
    return {
        ...record,
        summary: {
            ...record.summary,
            state: TimelineEntryState.Failed,
            errorText,
            durationInMilliseconds: Durations.betweenTimestamps(record.startedTimestamp, endedTimestamp),
        },
    };
}

function wasTouchedByRule(pending: TimelineRecord, simulator: IBrowserRuleSimulator): boolean {
    return TimelineAnnotations.isTouchedByRule(pending) || simulator.onRequest(pending) !== null;
}

export class LoadingFailedHandler implements ICdpEventHandler<"Network.loadingFailed"> {
    readonly event = "Network.loadingFailed";

    private readonly _dependencies: LoadingFailedDependencies;

    constructor(dependencies: LoadingFailedDependencies) {
        this._dependencies = dependencies;
    }

    async handle(tabId: number, event: Protocol.Network.LoadingFailedEvent): Promise<void> {
        const { timelineStore, pendingDocuments, admission, browserRuleSimulator } = this._dependencies;
        const errorText = event.canceled === true ? CanceledErrorText : event.errorText;

        const pending = pendingDocuments.take(tabId, event.requestId);
        if (pending !== undefined) {
            if (wasTouchedByRule(pending, browserRuleSimulator)) {
                admission.admit(failed(
                    pending,
                    errorText,
                    event.timestamp
                ));
            }

            return;
        }

        timelineStore.update(
            tabId,
            event.requestId,
            record => failed(
                record,
                errorText,
                event.timestamp
            )
        );
    }
}
