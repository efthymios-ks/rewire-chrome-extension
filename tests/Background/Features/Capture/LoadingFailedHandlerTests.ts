import type { Protocol } from "devtools-protocol";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { IBrowserRuleSimulator } from "../../../../src/Background/Features/Capture/BrowserRuleSimulator";
import { LoadingFailedHandler } from "../../../../src/Background/Features/Capture/LoadingFailedHandler";
import { PendingDocuments } from "../../../../src/Background/Features/Capture/PendingDocuments";
import type { ITimelineAdmission } from "../../../../src/Background/Features/Capture/TimelineAdmission";
import { TimelineStore } from "../../../../src/Background/Features/Capture/TimelineStore";
import { RuleEngine } from "../../../../src/Contracts/Rules/RuleEngine";
import { TimelineEntryState } from "../../../../src/Contracts/Timeline/TimelineEntryState";
import { aSummary } from "../../../TestData";
import { aTimelineRecord } from "../../BackgroundTestData";

const TabId = 7;
const RequestId = "request-1";

function anEvent(overrides: Partial<Protocol.Network.LoadingFailedEvent> = {}): Protocol.Network.LoadingFailedEvent {
    return {
        requestId: RequestId,
        timestamp: 101,
        type: "Document",
        errorText: "net::ERR_NAME_NOT_RESOLVED",
        ...overrides,
    };
}

function noRuleMatchedSimulator(): IBrowserRuleSimulator {
    return {
        onRequest: vi.fn().mockReturnValue(null),
        onResponse: vi.fn().mockReturnValue(null),
    };
}

function someRuleMatchedSimulator(): IBrowserRuleSimulator {
    return {
        onRequest: vi.fn().mockReturnValue({
            appliedRules: [],
            changes: [],
            isAnsweredByRule: false,
        }),
        onResponse: vi.fn().mockReturnValue(null),
    };
}

interface Harness {
    handler: LoadingFailedHandler;
    timelineStore: TimelineStore;
    pendingDocuments: PendingDocuments;
    admit: ReturnType<typeof vi.fn>;
    admission: ITimelineAdmission;
}

function setUp(simulator: IBrowserRuleSimulator = noRuleMatchedSimulator()): Harness {
    const timelineStore = new TimelineStore();
    const pendingDocuments = new PendingDocuments();
    const admit = vi.fn();
    const admission: ITimelineAdmission = {
        admit,
    };
    const handler = new LoadingFailedHandler({
        timelineStore,
        pendingDocuments,
        admission,
        browserRuleSimulator: simulator,
    });

    return {
        handler,
        timelineStore,
        pendingDocuments,
        admit,
        admission,
    };
}

describe("LoadingFailedHandler", () => {
    describe("already admitted records", () => {
        let harness: Harness;

        beforeEach(() => {
            harness = setUp();
            harness.timelineStore.add(aTimelineRecord({
                summary: aSummary({
                    id: RequestId,
                    state: TimelineEntryState.Pending,
                }),
            }));
        });

        test("handle_WhenAFailureEventArrives_ShouldMarkTheRecordAsFailed", async () => {
            // Arrange
            const event = anEvent({
                errorText: "net::ERR_FAILED",
            });

            // Act
            await harness.handler.handle(TabId, event);

            // Assert
            const record = harness.timelineStore.get(TabId, RequestId);
            expect(record?.summary.state).toBe(TimelineEntryState.Failed);
            expect(record?.summary.errorText).toBe("net::ERR_FAILED");
            expect(record?.summary.durationInMilliseconds).toBe(1000);
        });

        test("handle_WhenTheEventIsCanceled_ShouldUseTheCanceledMessage", async () => {
            // Arrange
            const event = anEvent({
                canceled: true,
                errorText: "net::ERR_ABORTED",
            });

            // Act
            await harness.handler.handle(TabId, event);

            // Assert
            expect(harness.timelineStore.get(TabId, RequestId)?.summary.errorText).toBe("Canceled");
        });
    });

    describe("pending documents", () => {
        test("handle_WhenAPendingDocumentHasARuleRedirect_ShouldAdmitItAsFailed", async () => {
            // Arrange
            const { handler, pendingDocuments, admit } = setUp();
            pendingDocuments.hold(aTimelineRecord({
                summary: aSummary({
                    id: RequestId,
                    redirectedFromUrl: "https://api.example.com/original",
                }),
            }));

            // Act
            await handler.handle(TabId, anEvent());

            // Assert
            expect(admit).toHaveBeenCalledOnce();
            const admitted = admit.mock.calls[0]?.[0];
            expect(admitted.summary.state).toBe(TimelineEntryState.Failed);
            expect(admitted.summary.errorText).toBe("net::ERR_NAME_NOT_RESOLVED");
            expect(pendingDocuments.has(TabId, RequestId)).toBe(false);
        });

        test("handle_WhenAPendingDocumentMatchesABrowserRule_ShouldAdmitItAsFailed", async () => {
            // Arrange
            const { handler, pendingDocuments, admit } = setUp(someRuleMatchedSimulator());
            pendingDocuments.hold(aTimelineRecord({
                summary: aSummary({
                    id: RequestId,
                }),
            }));

            // Act
            await handler.handle(TabId, anEvent());

            // Assert
            expect(admit).toHaveBeenCalledOnce();
        });

        test("handle_WhenAnInspectedTabRuleActedOnAPendingDocument_ShouldAdmitItAsFailed", async () => {
            // Arrange
            const { handler, pendingDocuments, admit } = setUp();
            pendingDocuments.hold(aTimelineRecord({
                summary: aSummary({
                    id: RequestId,
                    appliedRules: [
                        {
                            ruleId: "rule-1",
                            ruleName: "Add header",
                            engine: RuleEngine.Debugger,
                            note: "Request header",
                        },
                    ],
                }),
            }));

            // Act
            await handler.handle(TabId, anEvent());

            // Assert
            expect(admit).toHaveBeenCalledOnce();
        });

        test("handle_WhenAPendingDocumentHasNoRuleActivity_ShouldDropIt", async () => {
            // Arrange
            const { handler, pendingDocuments, admit } = setUp();
            pendingDocuments.hold(aTimelineRecord({
                summary: aSummary({
                    id: RequestId,
                }),
            }));

            // Act
            await handler.handle(TabId, anEvent());

            // Assert
            expect(admit).not.toHaveBeenCalled();
            expect(pendingDocuments.has(TabId, RequestId)).toBe(false);
        });
    });

    test("handle_WhenNothingKnowsAboutTheRequest_ShouldDoNothing", async () => {
        // Arrange
        const { handler, admit, timelineStore } = setUp();

        // Act
        await handler.handle(TabId, anEvent());

        // Assert
        expect(admit).not.toHaveBeenCalled();
        expect(timelineStore.get(TabId, RequestId)).toBeUndefined();
    });
});
