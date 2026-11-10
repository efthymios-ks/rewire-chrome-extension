import { describe, expect, test } from "vitest";
import { CaptureDecision, CaptureFilter } from "../../../../src/Background/Features/Capture/CaptureFilter";

describe("CaptureFilter", () => {
    test.each([
        [
            "Fetch",
            CaptureDecision.Capture,
        ],
        [
            "XHR",
            CaptureDecision.Capture,
        ],
        [
            "Document",
            CaptureDecision.CaptureWhenResponseIsData,
        ],
        [
            "Image",
            CaptureDecision.Skip,
        ],
        [
            "Stylesheet",
            CaptureDecision.Skip,
        ],
        [
            undefined,
            CaptureDecision.Skip,
        ],
    ])("decide_WhenResourceTypeIs(%s)_ShouldKeepApiCallsAndWaitOnDocuments", (resourceType, expected) => {
        // Arrange
        const filter = new CaptureFilter();

        // Act
        const decision = filter.decide(resourceType);

        // Assert
        expect(decision).toBe(expected);
    });

    test.each([
        [
            "application/json",
            true,
        ],
        [
            "application/problem+json",
            true,
        ],
        [
            "application/xml",
            true,
        ],
        [
            "text/plain",
            true,
        ],
        [
            "text/html",
            false,
        ],
        [
            "application/xhtml+xml",
            false,
        ],
        [
            "image/png",
            false,
        ],
        [
            "",
            false,
        ],
    ])("isDataResponse_WhenMimeTypeIs(%s)_ShouldKeepOnlyTextualDataThatIsNotAPage", (mimeType, expected) => {
        // Arrange
        const filter = new CaptureFilter();

        // Act
        const isData = filter.isDataResponse(mimeType);

        // Assert
        expect(isData).toBe(expected);
    });
});
