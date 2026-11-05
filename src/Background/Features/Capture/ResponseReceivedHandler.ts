import type { Protocol } from "devtools-protocol";
import { HeaderLookup } from "../../../Common/Http/HeaderLookup";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { IBrowserRuleSimulator } from "./BrowserRuleSimulator";
import type { ICaptureFilter } from "./CaptureFilter";
import type { ITimelineStore } from "./ITimelineStore";
import type { IPendingDocuments } from "./PendingDocuments";
import type { ITimelineAdmission } from "./TimelineAdmission";
import type { TimelineRecord } from "./TimelineRecord";
import type { ITimelineRecordClassifier } from "./TimelineRecordClassifier";

export interface ResponseReceivedDependencies {
    timelineStore: ITimelineStore;
    pendingDocuments: IPendingDocuments;
    admission: ITimelineAdmission;
    captureFilter: ICaptureFilter;
    recordClassifier: ITimelineRecordClassifier;
    browserRuleSimulator: IBrowserRuleSimulator;
}

export class ResponseReceivedHandler implements ICdpEventHandler<"Network.responseReceived"> {
    readonly event = "Network.responseReceived";

    private readonly _dependencies: ResponseReceivedDependencies;

    constructor(dependencies: ResponseReceivedDependencies) {
        this._dependencies = dependencies;
    }

    async handle(tabId: number, event: Protocol.Network.ResponseReceivedEvent): Promise<void> {
        const { timelineStore, recordClassifier, browserRuleSimulator } = this._dependencies;
        const record = timelineStore.get(tabId, event.requestId) ?? this.admitDocument(tabId, event);
        if (record === undefined) {
            return;
        }

        const responseHeaders = HeaderLookup.fromRecord(event.response.headers);
        timelineStore.update(
            tabId,
            event.requestId,
            current => recordClassifier.reclassify({
                ...current,
                responseHeaders,
                summary: {
                    ...current.summary,
                    statusCode: event.response.status,
                    statusText: event.response.statusText,
                    mimeType: event.response.mimeType,
                },
            })
        );

        if (record.summary.isAnsweredByRule) {
            return;
        }

        const annotation = browserRuleSimulator.onResponse(
            record,
            event.response.status,
            responseHeaders
        );
        if (annotation !== null) {
            timelineStore.annotate(
                tabId,
                event.requestId,
                annotation
            );
        }
    }

    private admitDocument(tabId: number, event: Protocol.Network.ResponseReceivedEvent): TimelineRecord | undefined {
        const { pendingDocuments, admission, captureFilter } = this._dependencies;
        const document = pendingDocuments.take(tabId, event.requestId);
        if (document === undefined || !captureFilter.isDataResponse(event.response.mimeType)) {
            return undefined;
        }

        admission.admit(document);

        return document;
    }
}
