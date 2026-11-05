import { describe, expect, test } from "vitest";
import type { DnrCondition } from "../../../../../src/Common/Rules/Criteria/DnrFragment";
import { RequestCookieRule } from "../../../../../src/Common/Rules/Types/Cookies/RequestCookieRule";
import { OperationKinds } from "../../../../../src/Common/Rules/Types/OperationKinds";
import { aRequestDraft, aRuleContext } from "../../../../TestData";

const ruleType = new RequestCookieRule();
const condition: DnrCondition = {
    urlFilter: "||api.example.com",
};

describe("RequestCookieRule", () => {
    test("applyRequest_WhenThereIsNoCookieHeader_ShouldAddOne", () => {
        // Arrange
        const action = {
            op: OperationKinds.AddOrUpdate,
            name: "session",
            value: "abc",
        };

        // Act
        const draft = ruleType.applyRequest(
            aRequestDraft(),
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.headers).toEqual([
            {
                name: "Accept",
                value: "application/json",
            },
            {
                name: "Cookie",
                value: "session=abc",
            },
        ]);
    });

    test("applyRequest_WhenAddOrUpdateAndTheCookieIsAlreadySent_ShouldReplaceItAndKeepTheOthers", () => {
        // Arrange
        const request = aRequestDraft({
            headers: [
                {
                    name: "cookie",
                    value: "theme=dark; session=old; lang=en",
                },
            ],
        });
        const action = {
            op: OperationKinds.AddOrUpdate,
            name: "session",
            value: "new",
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.headers).toEqual([
            {
                name: "Cookie",
                value: "theme=dark; lang=en; session=new",
            },
        ]);
    });

    test("applyRequest_WhenAddAndTheCookieIsAlreadySent_ShouldSendItTwice", () => {
        // Arrange
        const request = aRequestDraft({
            headers: [
                {
                    name: "Cookie",
                    value: "session=old",
                },
            ],
        });
        const action = {
            op: OperationKinds.Add,
            name: "session",
            value: "new",
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.headers).toEqual([
            {
                name: "Cookie",
                value: "session=old; session=new",
            },
        ]);
    });

    test("applyRequest_WhenAddIfMissingAndTheCookieIsAlreadySent_ShouldKeepIt", () => {
        // Arrange
        const request = aRequestDraft({
            headers: [
                {
                    name: "Cookie",
                    value: "theme=dark; session=old",
                },
            ],
        });
        const action = {
            op: OperationKinds.AddIfMissing,
            name: "session",
            value: "new",
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.headers).toEqual([
            {
                name: "Cookie",
                value: "theme=dark; session=old",
            },
        ]);
    });

    test("applyRequest_WhenAddIfMissingAndTheCookieIsMissing_ShouldAddIt", () => {
        // Arrange
        const request = aRequestDraft({
            headers: [
                {
                    name: "Cookie",
                    value: "theme=dark",
                },
            ],
        });
        const action = {
            op: OperationKinds.AddIfMissing,
            name: "session",
            value: "new",
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.headers).toEqual([
            {
                name: "Cookie",
                value: "theme=dark; session=new",
            },
        ]);
    });

    test("applyRequest_WhenOperationIsRemove_ShouldDropOnlyThatCookie", () => {
        // Arrange
        const request = aRequestDraft({
            headers: [
                {
                    name: "Cookie",
                    value: "theme=dark; session=old",
                },
            ],
        });
        const action = {
            op: OperationKinds.Remove,
            name: "session",
            value: "",
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.headers).toEqual([
            {
                name: "Cookie",
                value: "theme=dark",
            },
        ]);
    });

    test("applyRequest_WhenRemovingTheLastCookie_ShouldDropTheCookieHeader", () => {
        // Arrange
        const request = aRequestDraft({
            headers: [
                {
                    name: "Cookie",
                    value: "session=old",
                },
            ],
        });
        const action = {
            op: OperationKinds.Remove,
            name: "session",
            value: "",
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.headers).toEqual([]);
    });

    test("applyRequest_WhenValueIsATemplate_ShouldRenderTheVariable", () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable("sessionId", "s-42");
        const action = {
            op: OperationKinds.AddOrUpdate,
            name: "session",
            value: "{{sessionId}}",
        };

        // Act
        const draft = ruleType.applyRequest(
            aRequestDraft(),
            action,
            context
        );

        // Assert
        expect(draft.headers).toContainEqual({
            name: "Cookie",
            value: "session=s-42",
        });
    });

    test("validate_WhenNameIsBlank_ShouldRequireIt", () => {
        // Arrange
        const action = {
            op: OperationKinds.AddOrUpdate,
            name: " ",
            value: "abc",
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(["Cookie name is required."]);
    });

    test.each([
        [
            OperationKinds.AddOrUpdate,
            "session=abc",
        ],
        [
            OperationKinds.Remove,
            "remove session",
        ],
    ])("summary_WhenOperationIs(%s)_ShouldDescribeIt", (op, expected) => {
        // Arrange
        const action = {
            op,
            name: "session",
            value: "abc",
        };

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe(expected);
    });

    test("withoutSecrets_WhenCalled_ShouldBlankTheValue", () => {
        // Arrange
        const action = {
            op: OperationKinds.AddOrUpdate,
            name: "session",
            value: "abc",
        };

        // Act
        const stripped = ruleType.withoutSecrets(action);

        // Assert
        expect(stripped).toEqual({
            op: OperationKinds.AddOrUpdate,
            name: "session",
            value: "",
        });
    });

    test("defaultAction_WhenCreated_ShouldAddOrUpdate", () => {
        // Arrange
        const expected = OperationKinds.AddOrUpdate;

        // Act
        const action = ruleType.defaultAction();

        // Assert
        expect(action["op"]).toBe(expected);
    });

    test("toDnr_WhenCalled_ShouldWorkOnTheInspectedTabOnly", () => {
        // Arrange
        const action = {
            op: OperationKinds.AddOrUpdate,
            name: "session",
            value: "abc",
        };

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
