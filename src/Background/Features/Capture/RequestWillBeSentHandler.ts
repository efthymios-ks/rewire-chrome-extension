import type { Protocol } from "devtools-protocol";
import type { ILogger } from "../../../Common/Logging/ILogger";
import type { IDebuggerClient } from "../Debugging/IDebuggerClient";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { IBrowserRuleSimulator } from "./BrowserRuleSimulator";
import { CaptureDecision, type ICaptureFilter } from "./CaptureFilter";
import type { ITimelineStore } from "./ITimelineStore";
import type { IPendingDocuments } from "./PendingDocuments";
import { TimelineAnnotations } from "./TimelineAnnotations";
import type { ITimelineAdmission } from "./TimelineAdmission";
import type { ITimelineRecordClassifier } from "./TimelineRecordClassifier";
import type { ITimelineRecordFactory } from "./TimelineRecordFactory";

export interface RequestWillBeSentDependencies {
    timelineStore: ITimelineStore;
    pendingDocuments: IPendingDocuments;
    admission: ITimelineAdmission;
    captureFilter: ICaptureFilter;
    recordFactory: ITimelineRecordFactory;
    recordClassifier: ITimelineRecordClassifier;
    browserRuleSimulator: IBrowserRuleSimulator;
    debuggerClient: IDebuggerClient;
    logger: ILogger;
}

export class RequestWillBeSentHandler implements ICdpEventHandler<"Network.requestWillBeSent"> {
    readonly event = "Network.requestWillBeSent";

    private readonly _dependencies: RequestWillBeSentDependencies;

    constructor(dependencies: RequestWillBeSentDependencies) {
        this._dependencies = dependencies;
    }

    async handle(tabId: number, event: Protocol.Network.RequestWillBeSentEvent): Promise<void> {
        const { timelineStore, pendingDocuments, admission, captureFilter, recordFactory, browserRuleSimulator } = this._dependencies;
        const existing = timelineStore.get(tabId, event.requestId);
        if (existing !== undefined && event.redirectResponse !== undefined) {
            const annotation = browserRuleSimulator.onRequest(existing);
            if (annotation !== null) {
                timelineStore.annotate(
                    tabId,
                    event.requestId,
                    annotation
                );
            }

            const redirectResponse = event.redirectResponse;
            const endedTimestamp = event.timestamp;
            const annotated = timelineStore.get(tabId, event.requestId) ?? existing;
            timelineStore.addLeg(
                tabId,
                event.requestId,
                legId => recordFactory.toCompletedLeg(
                    annotated,
                    legId,
                    redirectResponse,
                    endedTimestamp
                )
            );
            timelineStore.update(
                tabId,
                event.requestId,
                record => recordFactory.redirect(record, event)
            );

            return;
        }

        const pending = pendingDocuments.get(tabId, event.requestId);
        if (pending !== undefined && event.redirectResponse !== undefined) {
            const annotation = browserRuleSimulator.onRequest(pending);
            if (annotation !== null || TimelineAnnotations.isTouchedByRule(pending)) {
                const annotated = annotation === null ? pending : TimelineAnnotations.applyTo(pending, annotation);
                const redirectResponse = event.redirectResponse;
                const endedTimestamp = event.timestamp;
                timelineStore.addLeg(
                    tabId,
                    event.requestId,
                    legId => recordFactory.toCompletedLeg(
                        annotated,
                        legId,
                        redirectResponse,
                        endedTimestamp
                    )
                );
            }

            pendingDocuments.update(
                tabId,
                event.requestId,
                record => recordFactory.redirect(record, event)
            );

            return;
        }

        if (existing !== undefined) {
            return;
        }

        const decision = captureFilter.decide(event.type);
        if (decision === CaptureDecision.CaptureWhenResponseIsData) {
            pendingDocuments.hold(recordFactory.create(tabId, event));

            return;
        }

        if (decision !== CaptureDecision.Capture) {
            return;
        }

        admission.admit(recordFactory.create(tabId, event));

        if (event.request.hasPostData === true && event.request.postData === undefined) {
            await this.loadPostData(tabId, event.requestId);
        }
    }

    private async loadPostData(tabId: number, requestId: string): Promise<void> {
        const { timelineStore, recordClassifier, debuggerClient, logger } = this._dependencies;
        const postData = await debuggerClient.send(
            tabId,
            "Network.getRequestPostData",
            {
                requestId,
            }
        );
        if (postData.hasErrors) {
            logger.warn(postData.error);

            return;
        }

        timelineStore.update(
            tabId,
            requestId,
            record => recordClassifier.reclassify({
                ...record,
                requestBody: postData.value.postData,
            })
        );
    }
}
