import { describe, expect, test } from "vitest";
import type { DnrCondition } from "../../../../../src/Common/Rules/Criteria/DnrFragment";
import { SetVariableRule, VariableSources } from "../../../../../src/Common/Rules/Types/Logic/SetVariableRule";
import { aRequestDraft, aResponseDraft, aRuleContext, TestUrls } from "../../../../TestData";

const ruleType = new SetVariableRule();
const condition: DnrCondition = {
    urlFilter: "||api.example.com",
};

function anAction(overrides: Partial<Parameters<SetVariableRule["validate"]>[0]> = {}) {
    return {
        variable: "captured",
        source: VariableSources.Url,
        key: "",
        pattern: "",
        path: "",
        ...overrides,
    };
}

describe("SetVariableRule", () => {
    test("applyRequest_WhenUrlPatternHasAGroup_ShouldStoreTheFirstGroupAndKeepTheRequest", () => {
        // Arrange
        const context = aRuleContext();
        const action = anAction({
            variable: " userId ",
            source: VariableSources.Url,
            pattern: "/users/(\\d+)",
        });

        // Act
        const draft = ruleType.applyRequest(
            aRequestDraft(),
            action,
            context
        );

        // Assert
        expect(context.variable("userId")).toBe("42");
        expect(draft).toEqual(aRequestDraft());
    });

    test("applyRequest_WhenPatternHasNoGroup_ShouldStoreTheWholeMatch", () => {
        // Arrange
        const context = aRuleContext();
        const action = anAction({
            variable: "version",
            source: VariableSources.Url,
            pattern: "v\\d+",
        });

        // Act
        ruleType.applyRequest(
            aRequestDraft(),
            action,
            context
        );

        // Assert
        expect(context.variable("version")).toBe("v1");
    });

    test.each([
        [
            VariableSources.Query,
            "page",
            "2",
        ],
        [
            VariableSources.RequestHeader,
            "accept",
            "application/json",
        ],
        [
            VariableSources.RequestCookie,
            "session",
            "abc",
        ],
    ])("applyRequest_WhenSourceIs(%s)WithKey(%s)_ShouldStore(%s)", (
        source,
        key,
        expected
    ) => {
        // Arrange
        const context = aRuleContext();
        const request = aRequestDraft({
            url: TestUrls.Orders,
            headers: [
                {
                    name: "Accept",
                    value: "application/json",
                },
                {
                    name: "Cookie",
                    value: "theme=dark; session=abc",
                },
            ],
        });
        const action = anAction({
            source,
            key,
        });

        // Act
        ruleType.applyRequest(
            request,
            action,
            context
        );

        // Assert
        expect(context.variable("captured")).toBe(expected);
    });

    test("applyRequest_WhenSourceIsRequestBodyJson_ShouldStoreTheValueAtTheJsonPath", () => {
        // Arrange
        const context = aRuleContext();
        const request = aRequestDraft({
            body: JSON.stringify({
                user: {
                    id: 42,
                },
                items: [{
                    sku: "A",
                }],
            }),
        });
        const action = anAction({
            variable: "sku",
            source: VariableSources.RequestBodyJson,
            path: "$.items[0].sku",
        });

        // Act
        ruleType.applyRequest(
            request,
            action,
            context
        );

        // Assert
        expect(context.variable("sku")).toBe("A");
    });

    test("applyRequest_WhenSourceIsRequestBodyJsonAndValueIsObject_ShouldStoreJsonText", () => {
        // Arrange
        const context = aRuleContext();
        const request = aRequestDraft({
            body: JSON.stringify({
                user: {
                    id: 42,
                    name: "Ada",
                },
            }),
        });
        const action = anAction({
            variable: "user",
            source: VariableSources.RequestBodyJson,
            path: "$.user",
        });

        // Act
        ruleType.applyRequest(
            request,
            action,
            context
        );

        // Assert
        expect(JSON.parse(context.variable("user")!)).toEqual({
            id: 42,
            name: "Ada",
        });
    });

    test("applyRequest_WhenSourceIsRequestBodyXml_ShouldStoreTheValueAtTheXPath", () => {
        // Arrange
        const context = aRuleContext();
        const request = aRequestDraft({
            body: "<order><item sku=\"A\"/></order>",
        });
        const action = anAction({
            variable: "sku",
            source: VariableSources.RequestBodyXml,
            path: "/order/item/@sku",
        });

        // Act
        ruleType.applyRequest(
            request,
            action,
            context
        );

        // Assert
        expect(context.variable("sku")).toBe("A");
    });

    test("applyResponse_WhenSourceIsResponseBodyJson_ShouldStoreTheValue", () => {
        // Arrange
        const context = aRuleContext();
        const response = aResponseDraft({
            body: JSON.stringify({
                token: "abc.def",
            }),
        });
        const action = anAction({
            variable: "token",
            source: VariableSources.ResponseBodyJson,
            path: "$.token",
        });

        // Act
        ruleType.applyResponse(
            response,
            action,
            context,
            aRequestDraft()
        );

        // Assert
        expect(context.variable("token")).toBe("abc.def");
    });

    test("applyResponse_WhenSourceIsResponseBodyXml_ShouldStoreTheTextOfTheNode", () => {
        // Arrange
        const context = aRuleContext();
        const response = aResponseDraft({
            body: "<response><trace>trace-1234</trace></response>",
        });
        const action = anAction({
            variable: "trace",
            source: VariableSources.ResponseBodyXml,
            path: "/response/trace",
        });

        // Act
        ruleType.applyResponse(
            response,
            action,
            context,
            aRequestDraft()
        );

        // Assert
        expect(context.variable("trace")).toBe("trace-1234");
    });

    test("applyRequest_WhenSourceIsAResponseBody_ShouldWaitForTheResponse", () => {
        // Arrange
        const context = aRuleContext();
        const action = anAction({
            variable: "token",
            source: VariableSources.ResponseBodyJson,
            path: "$.token",
        });

        // Act
        ruleType.applyRequest(
            aRequestDraft({
                body: JSON.stringify({
                    token: "abc",
                }),
            }),
            action,
            context
        );

        // Assert
        expect(context.variable("token")).toBeNull();
    });

    test("applyRequest_WhenNothingMatches_ShouldKeepThePreviousValue", () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable("orderId", "7");
        const action = anAction({
            variable: "orderId",
            source: VariableSources.Url,
            pattern: "/orders/(\\d+)",
        });

        // Act
        ruleType.applyRequest(
            aRequestDraft(),
            action,
            context
        );

        // Assert
        expect(context.variable("orderId")).toBe("7");
    });

    test("applyRequest_WhenSourceIsAResponseHeader_ShouldWaitForTheResponse", () => {
        // Arrange
        const context = aRuleContext();
        const action = anAction({
            variable: "contentType",
            source: VariableSources.ResponseHeader,
            key: "Accept",
        });

        // Act
        ruleType.applyRequest(
            aRequestDraft(),
            action,
            context
        );

        // Assert
        expect(context.variable("contentType")).toBeNull();
    });

    test("applyResponse_WhenSourceIsAResponseHeader_ShouldStoreTheMatch", () => {
        // Arrange
        const context = aRuleContext();
        const response = aResponseDraft({
            headers: [
                {
                    name: "X-Trace-Id",
                    value: "trace-1234",
                },
            ],
        });
        const action = anAction({
            variable: "traceId",
            source: VariableSources.ResponseHeader,
            key: "x-trace-id",
            pattern: "trace-(\\d+)",
        });

        // Act
        const draft = ruleType.applyResponse(
            response,
            action,
            context,
            aRequestDraft()
        );

        // Assert
        expect(context.variable("traceId")).toBe("1234");
        expect(draft).toEqual(response);
    });

    test("validate_WhenNameKeyAndRegexAreInvalid_ShouldReportEachOne", () => {
        // Arrange
        const action = anAction({
            variable: "1st",
            source: VariableSources.Query,
            key: " ",
            pattern: "(",
        });

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual([
            "Variable names start with a letter or _ and use letters, digits, _ . -.",
            "Name is required.",
            expect.stringMatching(/^Regex is invalid: /),
        ]);
    });

    test("validate_WhenJsonPathIsBlank_ShouldRequireIt", () => {
        // Arrange
        const action = anAction({
            variable: "x",
            source: VariableSources.RequestBodyJson,
            path: "",
        });

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(["Path is required."]);
    });

    test("validate_WhenJsonPathIsInvalid_ShouldReportIt", () => {
        // Arrange
        const action = anAction({
            variable: "x",
            source: VariableSources.RequestBodyJson,
            path: "user.name",
        });

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual([expect.stringMatching(/^Path is invalid: /)]);
    });

    test("validate_WhenXPathIsInvalid_ShouldReportIt", () => {
        // Arrange
        const action = anAction({
            variable: "x",
            source: VariableSources.RequestBodyXml,
            path: "order/root",
        });

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual([expect.stringMatching(/^Path is invalid: /)]);
    });

    test("toDnr_WhenCalled_ShouldNeedTheDebugger", () => {
        // Arrange
        const action = anAction({
            variable: "userId",
            source: VariableSources.Url,
            pattern: "/users/(\\d+)",
        });

        // Act
        const result = ruleType.toDnr(
            action,
            condition,
            aRuleContext()
        );

        // Assert
        expect(result).toBeNull();
    });
});
