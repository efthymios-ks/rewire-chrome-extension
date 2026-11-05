import { describe, expect, test } from "vitest";
import { ResponseReceivedHandler } from "../../../../src/Background/Features/Capture/ResponseReceivedHandler";
import { aSummary } from "../../../TestData";
import { aTimelineRecord } from "../../BackgroundTestData";
import { aResponseReceivedEvent, type CaptureParts, captureParts, DocumentUrl } from "./DocumentCaptureTestData";

const TabId = 7;

function handlerOf(parts: CaptureParts): ResponseReceivedHandler {
    return new ResponseReceivedHandler({
        timelineStore: parts.timelineStore,
        pendingDocuments: parts.pendingDocuments,
        admission: parts.admission,
        captureFilter: parts.captureFilter,
        recordClassifier: parts.recordClassifier,
        browserRuleSimulator: parts.browserRuleSimulator,
    });
}

function holdDocument(parts: CaptureParts): void {
    parts.pendingDocuments.hold(aTimelineRecord({
        summary: aSummary({
            url: DocumentUrl,
            resourceType: "Document",
            statusCode: null,
            mimeType: "",
        }),
    }));
}

describe("ResponseReceivedHandler", () => {
    test("handle_WhenAHeldDocumentAnswersWithJson_ShouldAddItToTheTimeline", async () => {
        // Arrange
        const parts = captureParts();
        holdDocument(parts);
        const handler = handlerOf(parts);

        // Act
        await handler.handle(TabId, aResponseReceivedEvent("application/json"));

        // Assert
        const entries = parts.timelineStore.list(TabId);
        expect(entries).toHaveLength(1);
        expect(entries[0]?.url).toBe(DocumentUrl);
        expect(entries[0]?.statusCode).toBe(200);
        expect(entries[0]?.statusText).toBe("OK");
        expect(entries[0]?.mimeType).toBe("application/json");
    });

    test("handle_WhenAHeldDocumentAnswersWithHtml_ShouldDropIt", async () => {
        // Arrange
        const parts = captureParts();
        holdDocument(parts);
        const handler = handlerOf(parts);

        // Act
        await handler.handle(TabId, aResponseReceivedEvent("text/html"));

        // Assert
        expect(parts.timelineStore.list(TabId)).toHaveLength(0);
        expect(parts.pendingDocuments.has(TabId, "request-1")).toBe(false);
    });

    test("handle_WhenTheRequestWasNeverSeen_ShouldIgnoreIt", async () => {
        // Arrange
        const parts = captureParts();
        const handler = handlerOf(parts);

        // Act
        await handler.handle(TabId, aResponseReceivedEvent("application/json"));

        // Assert
        expect(parts.timelineStore.list(TabId)).toHaveLength(0);
    });
});
