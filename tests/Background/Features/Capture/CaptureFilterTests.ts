import { describe, expect, test } from "vitest";
import { CaptureDecision, CaptureFilter } from "../../../../src/Background/Features/Capture/CaptureFilter";
import { aSettings, TestUrls } from "../../../TestData";
import { settingsCacheOf } from "../../BackgroundTestData";

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
        const filter = new CaptureFilter(settingsCacheOf(aSettings()));

        // Act
        const decision = filter.decide(TestUrls.UsersProfile, resourceType);

        // Assert
        expect(decision).toBe(expected);
    });

    test("decide_WhenAWhitelistIsSet_ShouldDropOtherDomains", () => {
        // Arrange
        const filter = new CaptureFilter(settingsCacheOf(aSettings({
            domainWhitelist: ["example.com"],
        })));

        // Act
        const keepsApi = filter.decide(TestUrls.UsersProfile, "Fetch");
        const dropsAnalytics = filter.decide("https://www.google-analytics.com/collect", "Fetch");
        const dropsOtherDocuments = filter.decide("https://jsonplaceholder.typicode.com/posts", "Document");

        // Assert
        expect(keepsApi).toBe(CaptureDecision.Capture);
        expect(dropsAnalytics).toBe(CaptureDecision.Skip);
        expect(dropsOtherDocuments).toBe(CaptureDecision.Skip);
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
        const filter = new CaptureFilter(settingsCacheOf(aSettings()));

        // Act
        const isData = filter.isDataResponse(mimeType);

        // Assert
        expect(isData).toBe(expected);
    });
});
