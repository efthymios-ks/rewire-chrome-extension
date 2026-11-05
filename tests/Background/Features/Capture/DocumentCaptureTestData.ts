import type { Protocol } from "devtools-protocol";
import { vi } from "vitest";
import type { IBrowserRuleSimulator } from "../../../../src/Background/Features/Capture/BrowserRuleSimulator";
import { CaptureFilter } from "../../../../src/Background/Features/Capture/CaptureFilter";
import { PendingDocuments } from "../../../../src/Background/Features/Capture/PendingDocuments";
import { TimelineAdmission } from "../../../../src/Background/Features/Capture/TimelineAdmission";
import { TimelineRecordClassifier } from "../../../../src/Background/Features/Capture/TimelineRecordClassifier";
import { TimelineRecordFactory } from "../../../../src/Background/Features/Capture/TimelineRecordFactory";
import { TimelineStore } from "../../../../src/Background/Features/Capture/TimelineStore";
import { ContentKindClassifier } from "../../../../src/Common/Content/ContentKindClassifier";
import { aSettings } from "../../../TestData";
import { settingsCacheOf } from "../../BackgroundTestData";

export const DocumentUrl = "https://jsonplaceholder.typicode.com/posts";

export interface CaptureParts {
    timelineStore: TimelineStore;
    pendingDocuments: PendingDocuments;
    admission: TimelineAdmission;
    captureFilter: CaptureFilter;
    recordClassifier: TimelineRecordClassifier;
    recordFactory: TimelineRecordFactory;
    browserRuleSimulator: IBrowserRuleSimulator;
}

export function captureParts(): CaptureParts {
    const timelineStore = new TimelineStore();
    const recordClassifier = new TimelineRecordClassifier(new ContentKindClassifier());
    const browserRuleSimulator: IBrowserRuleSimulator = {
        onRequest: vi.fn().mockReturnValue(null),
        onResponse: vi.fn().mockReturnValue(null),
    };

    return {
        timelineStore,
        pendingDocuments: new PendingDocuments(),
        admission: new TimelineAdmission(timelineStore, browserRuleSimulator),
        captureFilter: new CaptureFilter(settingsCacheOf(aSettings())),
        recordClassifier,
        recordFactory: new TimelineRecordFactory(recordClassifier),
        browserRuleSimulator,
    };
}

export function aResponseReceivedEvent(mimeType: string): Protocol.Network.ResponseReceivedEvent {
    return {
        requestId: "request-1",
        loaderId: "loader-1",
        timestamp: 101,
        type: "Document",
        hasExtraInfo: false,
        response: {
            url: DocumentUrl,
            status: 200,
            statusText: "OK",
            headers: {
                "content-type": mimeType,
            },
            mimeType,
            charset: "utf-8",
            connectionReused: false,
            connectionId: 1,
            encodedDataLength: 100,
            securityState: "secure",
        },
    } as Protocol.Network.ResponseReceivedEvent;
}
