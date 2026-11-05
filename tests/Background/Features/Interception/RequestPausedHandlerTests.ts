import { describe, expect, test, vi } from "vitest";
import { PendingDocuments } from "../../../../src/Background/Features/Capture/PendingDocuments";
import { TimelineStore } from "../../../../src/Background/Features/Capture/TimelineStore";
import { RequestPausedHandler } from "../../../../src/Background/Features/Interception/RequestPausedHandler";
import { Base64Text } from "../../../../src/Common/Encoding/Base64Text";
import { Result } from "../../../../src/Common/Results/Result";
import { CriterionFieldIds, CriterionOperatorIds } from "../../../../src/Contracts/Rules/Criterion";
import type { Rule } from "../../../../src/Contracts/Rules/Rule";
import { RuleTypeIds } from "../../../../src/Contracts/Rules/RuleTypeIds";
import { aCriterion, aRule } from "../../../TestData";
import {
    activeRulesOf,
    aPausedEvent,
    aTimelineRecord,
    createDebuggerClientMock,
    createHitCounterMock,
    createLogger,
} from "../../BackgroundTestData";

const TabId = 7;

function onAcceptHeader(rule: Rule): Rule {
    return {
        ...rule,
        criteria: {
            match: "all",
            items: [
                aCriterion({
                    field: CriterionFieldIds.RequestHeader,
                    op: CriterionOperatorIds.Exists,
                    name: "Accept",
                    value: "",
                }),
            ],
        },
    };
}

function setUp(rules: Rule[]) {
    const debuggerClient = createDebuggerClientMock();
    const hitCounter = createHitCounterMock();
    const timelineStore = new TimelineStore();
    timelineStore.add(aTimelineRecord());
    const pendingDocuments = new PendingDocuments();
    const handler = new RequestPausedHandler({
        activeRules: activeRulesOf(rules),
        debuggerClient: debuggerClient.client,
        timelineStore,
        pendingDocuments,
        hitCounter: hitCounter.counter,
        logger: createLogger(),
    });

    return {
        handler,
        send: debuggerClient.send,
        count: hitCounter.count,
        timelineStore,
        pendingDocuments,
    };
}

function paramsOf(send: ReturnType<typeof createDebuggerClientMock>["send"], command: string): Record<string, unknown> {
    const call = send.mock.calls.find(candidate => candidate[1] === command);

    return (call?.[2] ?? {}) as Record<string, unknown>;
}

describe("RequestPausedHandler", () => {
    test("handle_WhenNoRuleMatches_ShouldContinueUnchanged", async () => {
        // Arrange
        const { handler, send, count } = setUp([]);

        // Act
        await handler.handle(TabId, aPausedEvent());

        // Assert
        expect(paramsOf(send, "Fetch.continueRequest")).toEqual({
            requestId: "interception-1",
            url: undefined,
            method: undefined,
            headers: undefined,
            postData: undefined,
        });
        expect(count).not.toHaveBeenCalled();
    });

    test("handle_WhenARequestHeaderRuleMatches_ShouldContinueWithTheNewHeaderAndAnnotate", async () => {
        // Arrange
        const rule = onAcceptHeader(aRule({
            id: "header-rule",
            name: "Debug header",
            type: RuleTypeIds.RequestHeader,
            action: {
                operations: [
                    {
                        op: "set",
                        name: "X-Debug",
                        value: "1",
                    },
                ],
            },
        }));
        const { handler, send, count, timelineStore } = setUp([rule]);

        // Act
        await handler.handle(TabId, aPausedEvent());

        // Assert
        expect(paramsOf(send, "Fetch.continueRequest")["headers"]).toEqual([
            {
                name: "Accept",
                value: "application/json",
            },
            {
                name: "X-Debug",
                value: "1",
            },
        ]);
        expect(count).toHaveBeenCalledWith("header-rule");
        expect(timelineStore.get(TabId, "request-1")?.summary.appliedRules.map(applied => applied.ruleName)).toEqual(["Debug header"]);
    });

    test("handle_WhenAMockMatches_ShouldFulfillWithABase64Body", async () => {
        // Arrange
        const { handler, send, timelineStore } = setUp([aRule()]);

        // Act
        await handler.handle(TabId, aPausedEvent());

        // Assert
        expect(paramsOf(send, "Fetch.fulfillRequest")).toMatchObject({
            requestId: "interception-1",
            responseCode: 200,
            body: Base64Text.fromUtf8("{\"id\":42}"),
        });
        expect(timelineStore.get(TabId, "request-1")?.summary.isAnsweredByRule).toBe(true);
    });

    test("handle_WhenAMockAnswers_ShouldApplyTheResponseRulesBeforeFulfilling", async () => {
        // Arrange
        const header = aRule({
            id: "response-header",
            type: RuleTypeIds.ResponseHeader,
            action: {
                operations: [
                    {
                        op: "addOrUpdate",
                        name: "X-Test",
                        value: "123",
                    },
                ],
            },
        });
        const { handler, send, timelineStore } = setUp([
            aRule(),
            header,
        ]);

        // Act
        await handler.handle(TabId, aPausedEvent());

        // Assert
        expect(paramsOf(send, "Fetch.fulfillRequest")["responseHeaders"]).toContainEqual({
            name: "X-Test",
            value: "123",
        });
        expect(timelineStore.get(TabId, "request-1")?.summary.appliedRules.map(applied => applied.ruleId)).toEqual([
            "rule-1",
            "response-header",
        ]);
    });

    test("handle_WhenAResponseRuleMatches_ShouldFulfillWithoutEncodingHeaders", async () => {
        // Arrange
        const rule = aRule({
            type: RuleTypeIds.MockResponse,
            action: {
                overrideStatus: true,
                status: 503,
                overrideBody: false,
            },
        });
        const { handler, send } = setUp([rule]);
        send.mockImplementation(async (_tabId, command) => command === "Fetch.getResponseBody"
            ? Result.ok({
                body: "e30=",
                base64Encoded: true,
            })
            : Result.ok({}));
        await handler.handle(TabId, aPausedEvent());

        // Act
        await handler.handle(TabId, aPausedEvent({
            responseStatusCode: 200,
            responseHeaders: [
                {
                    name: "Content-Encoding",
                    value: "gzip",
                },
                {
                    name: "Content-Type",
                    value: "application/json",
                },
            ],
        }));

        // Assert
        expect(paramsOf(send, "Fetch.fulfillRequest")).toEqual({
            requestId: "interception-1",
            responseCode: 503,
            responseHeaders: [
                {
                    name: "Content-Type",
                    value: "application/json",
                },
            ],
            body: "e30=",
        });
    });

    test("handle_WhenTheResponseHasNoPendingRequest_ShouldContinueAsIs", async () => {
        // Arrange
        const { handler, send } = setUp([]);

        // Act
        await handler.handle(TabId, aPausedEvent({
            responseStatusCode: 200,
        }));

        // Assert
        expect(paramsOf(send, "Fetch.continueRequest")).toEqual({
            requestId: "interception-1",
        });
    });

    test("handle_WhenAPendingDocumentIsRuleAnswered_ShouldAnnotateThePendingRecord", async () => {
        // Arrange
        const { handler, timelineStore, pendingDocuments } = setUp([aRule()]);
        timelineStore.clear(TabId);
        pendingDocuments.hold(aTimelineRecord({
            summary: {
                ...aTimelineRecord().summary,
                id: "request-1",
            },
        }));

        // Act
        await handler.handle(TabId, aPausedEvent());

        // Assert
        const pending = pendingDocuments.get(TabId, "request-1");
        expect(pending?.summary.appliedRules.map(rule => rule.ruleId)).toEqual(["rule-1"]);
        expect(pending?.summary.isAnsweredByRule).toBe(true);
        expect(timelineStore.get(TabId, "request-1")).toBeUndefined();
    });

    test("handle_WhenAPreflightMatchesARuleWithLatency_ShouldAnswerItWithoutWaiting", async () => {
        // Arrange
        vi.useFakeTimers();
        const latency = aRule({
            id: "latency",
            type: RuleTypeIds.Delay,
            action: {
                delayMs: 5000,
            },
        });
        const { handler, send } = setUp([
            latency,
            aRule(),
        ]);
        const preflight = aPausedEvent({
            resourceType: "XHR",
            request: {
                ...aPausedEvent().request,
                method: "OPTIONS",
                headers: {
                    "Origin": "https://app.example.com",
                    "Access-Control-Request-Method": "GET",
                },
            },
        });

        // Act
        const handled = handler.handle(TabId, preflight);
        await vi.advanceTimersByTimeAsync(0);

        // Assert
        expect(paramsOf(send, "Fetch.fulfillRequest")["responseCode"]).toBe(204);
        await handled;
        vi.useRealTimers();
    });
});
