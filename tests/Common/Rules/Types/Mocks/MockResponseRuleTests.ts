import { describe, expect, test } from "vitest";
import type { DnrCondition } from "../../../../../src/Common/Rules/Criteria/DnrFragment";
import { MockMessages, MockResponseRule } from "../../../../../src/Common/Rules/Types/Mocks/MockResponseRule";
import { CriteriaMatches, type RuleCriteria } from "../../../../../src/Contracts/Rules/Criterion";
import { aCriterion, aRequestDraft, aResponseDraft, aRuleContext } from "../../../../TestData";

const ruleType = new MockResponseRule();
const condition: DnrCondition = {
    urlFilter: "||api.example.com",
};
const statusOnly = {
    overrideStatus: true,
    status: 503,
    overrideBody: false,
    contentType: "application/json",
    headers: [],
    body: "{\"mocked\":true}",
};
const bodyOnly = {
    overrideStatus: false,
    status: 503,
    overrideBody: true,
    contentType: "text/plain",
    headers: [],
    body: "mocked",
};

function criteriaOf(...items: RuleCriteria["items"]): RuleCriteria {
    return {
        match: CriteriaMatches.All,
        items,
    };
}

describe("MockResponseRule", () => {
    test("applyRequest_WhenActionIsSet_ShouldAnswerWithRenderedStatusHeadersAndBody", () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable("build", "b7");
        context.setVariable("userId", "42");
        const action = {
            status: 201,
            contentType: " application/json ",
            headers: [
                {
                    key: " X-Mock ",
                    value: "{{build}}",
                },
            ],
            body: "{\"id\":{{userId}}}",
            baselineBody: "",
        };

        // Act
        const draft = ruleType.applyRequest(
            aRequestDraft(),
            action,
            context
        );

        // Assert
        expect(draft.response).toEqual({
            status: 201,
            headers: [
                {
                    name: "Content-Type",
                    value: "application/json",
                },
                {
                    name: "X-Mock",
                    value: "b7",
                },
            ],
            body: "{\"id\":42}",
        });
    });

    test("applyRequest_WhenTheRequestHasAnOrigin_ShouldEchoItInCorsHeaders", () => {
        // Arrange
        const request = aRequestDraft({
            headers: [
                {
                    name: "origin",
                    value: "http://localhost:3000",
                },
            ],
        });
        const action = {
            status: 200,
            contentType: "",
            headers: [],
            body: "{}",
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.response?.headers).toEqual([
            {
                name: "Access-Control-Allow-Origin",
                value: "http://localhost:3000",
            },
            {
                name: "Access-Control-Allow-Credentials",
                value: "true",
            },
            {
                name: "Access-Control-Expose-Headers",
                value: "*",
            },
            {
                name: "Vary",
                value: "Origin",
            },
        ]);
    });

    test("applyRequest_WhenFieldsAreMissing_ShouldAnswer200AsJsonWithAnEmptyBody", () => {
        // Arrange
        const action = {};

        // Act
        const draft = ruleType.applyRequest(
            aRequestDraft(),
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.response).toEqual({
            status: 200,
            headers: [
                {
                    name: "Content-Type",
                    value: "application/json",
                },
            ],
            body: "",
        });
    });

    test.each([
        99,
        600,
        201.5,
    ])("validate_WhenStatusIs(%s)_ShouldRejectIt", status => {
        // Arrange
        const action = {
            status,
            contentType: "application/json",
            headers: [],
            body: "{}",
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(["Status must be a whole number from 100 to 599."]);
    });

    test("validate_WhenAHeaderNameHasSpaces_ShouldRejectIt", () => {
        // Arrange
        const action = {
            status: 200,
            headers: [
                {
                    key: "X Mock",
                    value: "1",
                },
            ],
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(["Header name is empty or has characters a header can't carry."]);
    });

    test("summary_WhenSet_ShouldShowStatusAndContentType", () => {
        // Arrange
        const action = {
            status: 404,
            contentType: "text/plain",
        };

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe("404 text/plain");
    });

    test("toDnr_WhenCalled_ShouldNeedTheDebugger", () => {
        // Arrange
        const action = ruleType.defaultAction();

        // Act
        const result = ruleType.toDnr(
            action,
            condition,
            aRuleContext()
        );

        // Assert
        expect(result).toBeNull();
    });

    test("applyRequest_WhenTheRequestIsACorsPreflight_ShouldAllowItInsteadOfMockingIt", () => {
        // Arrange
        const preflight = aRequestDraft({
            method: "OPTIONS",
            headers: [
                {
                    name: "Origin",
                    value: "https://app.example.com",
                },
                {
                    name: "Access-Control-Request-Method",
                    value: "POST",
                },
                {
                    name: "Access-Control-Request-Headers",
                    value: "authorization",
                },
            ],
        });

        // Act
        const draft = ruleType.applyRequest(
            preflight,
            ruleType.defaultAction(),
            aRuleContext()
        );

        // Assert
        expect(draft.response?.status).toBe(204);
        expect(draft.response?.body).toBe("");
        expect(draft.response?.headers).toEqual(expect.arrayContaining([
            {
                name: "Access-Control-Allow-Origin",
                value: "https://app.example.com",
            },
            {
                name: "Access-Control-Allow-Methods",
                value: "POST",
            },
            {
                name: "Access-Control-Allow-Headers",
                value: "authorization",
            },
        ]));
    });
    test.each([
        [
            "status only",
            statusOnly,
        ],
        [
            "body only",
            bodyOnly,
        ],
    ])("applyRequest_WhenOverriding(%s)_ShouldLetTheRequestReachTheServer", (_name, action) => {
        // Arrange
        const request = aRequestDraft();

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft).toEqual(request);
    });

    test("applyResponse_WhenOverridingTheStatusOnly_ShouldKeepTheServerBody", () => {
        // Arrange
        const response = aResponseDraft();

        // Act
        const draft = ruleType.applyResponse(
            response,
            statusOnly,
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft).toEqual({
            ...response,
            status: 503,
        });
    });

    test("applyResponse_WhenOverridingTheBodyOnly_ShouldKeepTheServerStatus", () => {
        // Arrange
        const response = aResponseDraft({
            status: 404,
        });

        // Act
        const draft = ruleType.applyResponse(
            response,
            bodyOnly,
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft.status).toBe(404);
        expect(draft.body).toBe("mocked");
        expect(draft.headers).toEqual([
            {
                name: "Content-Type",
                value: "text/plain",
            },
        ]);
    });

    test("applyResponse_WhenOverridingBoth_ShouldReplaceStatusHeadersAndBody", () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable("build", "b7");
        const action = {
            overrideStatus: true,
            status: 418,
            overrideBody: true,
            contentType: "text/plain",
            headers: [
                {
                    key: "X-Mock",
                    value: "{{build}}",
                },
            ],
            body: "teapot",
        };

        // Act
        const draft = ruleType.applyResponse(
            aResponseDraft(),
            action,
            context,
            aRequestDraft()
        );

        // Assert
        expect(draft.status).toBe(418);
        expect(draft.body).toBe("teapot");
        expect(draft.headers).toEqual([
            {
                name: "Content-Type",
                value: "text/plain",
            },
            {
                name: "X-Mock",
                value: "b7",
            },
        ]);
    });

    test("applyResponse_WhenTheRequestFailed_ShouldLeaveTheFailure", () => {
        // Arrange
        const response = aResponseDraft({
            status: 0,
            body: null,
            errorReason: "ConnectionRefused",
        });

        // Act
        const draft = ruleType.applyResponse(
            response,
            ruleType.defaultAction(),
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft).toEqual(response);
    });

    test("validate_WhenNothingIsOverridden_ShouldAskForTheStatusOrTheBody", () => {
        // Arrange
        const action = {
            ...statusOnly,
            overrideStatus: false,
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual([MockMessages.NothingToOverride]);
    });

    test("validate_WhenTheStatusIsNotOverridden_ShouldIgnoreAnInvalidStatus", () => {
        // Arrange
        const action = {
            ...bodyOnly,
            status: 99,
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual([]);
    });

    test.each([
        [
            statusOnly,
            "503",
        ],
        [
            bodyOnly,
            "text/plain",
        ],
    ])("summary_WhenOverridingPartOfTheResponse(%#)_ShouldShow(%s)", (action, expected) => {
        // Arrange
        const partial = action;

        // Act
        const summary = ruleType.summary(partial);

        // Assert
        expect(summary).toBe(expected);
    });

    test("runsAtResponse_WhenAFullMockHasRequestConditions_ShouldBeFalse", () => {
        // Arrange
        const criteria = criteriaOf(aCriterion());

        // Act
        const runs = ruleType.runsAtResponse(ruleType.defaultAction(), criteria);

        // Assert
        expect(runs).toBe(false);
    });

    test("runsAtResponse_WhenOnlyTheStatusIsOverridden_ShouldBeTrue", () => {
        // Arrange
        const criteria = criteriaOf(aCriterion());

        // Act
        const runs = ruleType.runsAtResponse(statusOnly, criteria);

        // Assert
        expect(runs).toBe(true);
    });

    test("runsAtResponse_WhenAFullMockHasAResponseStatusCondition_ShouldBeTrue", () => {
        // Arrange
        const criteria = criteriaOf(aCriterion({
            field: "responseStatus",
            op: "range",
            value: "5xx",
        }));

        // Act
        const runs = ruleType.runsAtResponse(ruleType.defaultAction(), criteria);

        // Assert
        expect(runs).toBe(true);
    });

    test("delayOf_WhenTheActionHoldsADelay_ShouldBeZero", () => {
        // Arrange
        const action = {
            ...ruleType.defaultAction(),
            delayMs: 2000,
        };

        // Act
        const delay = ruleType.delayOf(action);

        // Assert
        expect(delay).toBe(0);
    });
});
