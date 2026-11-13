import type { Protocol } from "devtools-protocol";
import { describe, expect, test } from "vitest";
import { TimelineRecordClassifier } from "../../../../src/Background/Features/Capture/TimelineRecordClassifier";
import { TimelineRecordFactory } from "../../../../src/Background/Features/Capture/TimelineRecordFactory";
import { FrameRegistry } from "../../../../src/Background/Features/Frames/FrameRegistry";
import { ContentKindClassifier } from "../../../../src/Common/Content/ContentKindClassifier";
import { RuleEngine } from "../../../../src/Contracts/Rules/RuleEngine";
import { ChangeArea } from "../../../../src/Contracts/Rules/ValueChange";
import { ContentKind } from "../../../../src/Contracts/Timeline/ContentKind";
import { TimelineEntryState } from "../../../../src/Contracts/Timeline/TimelineEntryState";
import { TestUrls } from "../../../TestData";
import { aRequestWillBeSentEvent } from "../../BackgroundTestData";

const frameRegistry = new FrameRegistry();
const factory = new TimelineRecordFactory(new TimelineRecordClassifier(new ContentKindClassifier()), frameRegistry);

describe("TimelineRecordFactory", () => {
    test("create_WhenARequestStarts_ShouldBuildAPendingSummary", () => {
        // Arrange
        const event = aRequestWillBeSentEvent();

        // Act
        const record = factory.create(7, event);

        // Assert
        expect(record.summary).toMatchObject({
            id: "request-1",
            tabId: 7,
            method: "GET",
            host: "api.example.com",
            path: "/api/v1/users/42/profile",
            endpointKey: "GET https://api.example.com/api/v1/users/42/profile",
            resourceType: "Fetch",
            state: TimelineEntryState.Pending,
            startedAt: "2026-11-05T10:00:00.000Z",
        });
        expect(record.requestHeaders).toEqual([
            {
                name: "Accept",
                value: "application/json",
            },
        ]);
        expect(record.startedTimestamp).toBe(100);
    });

    test("create_WhenAnIframeSendsTheRequest_ShouldRecordItsFrame", () => {
        // Arrange
        frameRegistry.setTop(8, "top-frame");
        const event = aRequestWillBeSentEvent({
            frameId: "iframe-1",
            documentURL: "https://widget.example.com/embed",
        });

        // Act
        const record = factory.create(8, event);

        // Assert
        expect(record.summary.frame).toEqual({
            id: "iframe-1",
            url: "https://widget.example.com/embed",
            isTop: false,
        });
    });

    test("create_WhenTheBodyCarriesAQuery_ShouldClassifyGraphQl", () => {
        // Arrange
        const event = aRequestWillBeSentEvent({
            request: {
                url: "https://api.example.com/api",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                postData: "{\"query\":\"{ me { id } }\"}",
                initialPriority: "High",
                referrerPolicy: "no-referrer",
            },
        });

        // Act
        const record = factory.create(7, event);

        // Assert
        expect(record.summary.contentKind).toBe(ContentKind.GraphQl);
        expect(record.requestContentType).toBe("application/json");
    });

    test("redirect_WhenTheRequestIsRedirected_ShouldKeepTheOriginalUrl", () => {
        // Arrange
        const original = factory.create(7, aRequestWillBeSentEvent());
        const redirectEvent = aRequestWillBeSentEvent({
            request: {
                url: "http://localhost:5000/users/42/profile",
                method: "GET",
                headers: {},
                initialPriority: "High",
                referrerPolicy: "no-referrer",
            },
        });

        // Act
        const redirected = factory.redirect(original, redirectEvent);

        // Assert
        expect(redirected.summary.url).toBe("http://localhost:5000/users/42/profile");
        expect(redirected.summary.host).toBe("localhost");
        expect(redirected.summary.redirectedFromUrl).toBe(TestUrls.UsersProfile);
    });

    test("redirect_WhenTheOriginalWasRuleAnswered_ShouldResetAppliedRulesAndTimestamp", () => {
        // Arrange
        const original = factory.create(7, aRequestWillBeSentEvent());
        const touched = {
            ...original,
            summary: {
                ...original.summary,
                appliedRules: [
                    {
                        ruleId: "rule-1",
                        ruleName: "Rule",
                        engine: RuleEngine.Debugger,
                        note: "note",
                    },
                ],
                isAnsweredByRule: true,
                statusCode: 308,
                statusText: "Permanent Redirect",
            },
            changes: [
                {
                    area: ChangeArea.Status,
                    name: "status",
                    before: null,
                    after: "308",
                },
            ],
        };
        const redirectEvent = aRequestWillBeSentEvent({
            timestamp: 250,
            request: {
                url: "http://localhost:5000/users",
                method: "GET",
                headers: {},
                initialPriority: "High",
                referrerPolicy: "no-referrer",
            },
        });

        // Act
        const redirected = factory.redirect(touched, redirectEvent);

        // Assert
        expect(redirected.summary.appliedRules).toEqual([]);
        expect(redirected.summary.isAnsweredByRule).toBe(false);
        expect(redirected.summary.state).toBe(TimelineEntryState.Pending);
        expect(redirected.summary.statusCode).toBeNull();
        expect(redirected.summary.statusText).toBe("");
        expect(redirected.changes).toEqual([]);
        expect(redirected.startedTimestamp).toBe(250);
    });

    test("toCompletedLeg_WhenCalled_ShouldReturnACompletedCloneWithTheRedirectResponse", () => {
        // Arrange
        const base = factory.create(7, aRequestWillBeSentEvent());
        const response: Protocol.Network.Response = {
            url: TestUrls.UsersProfile,
            status: 308,
            statusText: "Permanent Redirect",
            headers: {
                location: "http://localhost:5000/users",
            },
            mimeType: "",
            charset: "",
            connectionReused: false,
            connectionId: 1,
            encodedDataLength: 0,
            securityState: "secure",
        };

        // Act
        const leg = factory.toCompletedLeg(
            base,
            "request-1-leg-1",
            response,
            260
        );

        // Assert
        expect(leg.summary.id).toBe("request-1-leg-1");
        expect(leg.summary.state).toBe(TimelineEntryState.Completed);
        expect(leg.summary.statusCode).toBe(308);
        expect(leg.summary.statusText).toBe("Permanent Redirect");
        expect(leg.summary.durationInMilliseconds).toBe(160000);
        expect(leg.responseHeaders).toEqual([
            {
                name: "location",
                value: "http://localhost:5000/users",
            },
        ]);
        expect(leg.responseBody).toBeNull();
    });
});
