import { describe, expect, test } from "vitest";
import type { DnrCondition } from "../../../../../src/Common/Rules/Criteria/DnrFragment";
import { AllowEmbeddingRule } from "../../../../../src/Common/Rules/Types/Headers/AllowEmbeddingRule";
import { aRequestDraft, aResponseDraft, aRuleContext } from "../../../../TestData";

const ruleType = new AllowEmbeddingRule();
const condition: DnrCondition = {
    urlFilter: "||widget.example.com",
};

function aFramedResponse() {
    return aResponseDraft({
        headers: [
            {
                name: "X-Frame-Options",
                value: "DENY",
            },
            {
                name: "Content-Security-Policy",
                value: "default-src 'self'; frame-ancestors 'none'; img-src *",
            },
            {
                name: "Content-Type",
                value: "text/html",
            },
        ],
    });
}

describe("AllowEmbeddingRule", () => {
    test("applyResponse_WhenTheRestOfTheCspIsKept_ShouldOnlyCutFrameAncestors", () => {
        // Arrange
        const action = {
            keepCsp: true,
        };

        // Act
        const draft = ruleType.applyResponse(
            aFramedResponse(),
            action,
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft.headers).toEqual([
            {
                name: "Content-Security-Policy",
                value: "default-src 'self'; img-src *",
            },
            {
                name: "Content-Type",
                value: "text/html",
            },
        ]);
    });

    test("applyResponse_WhenFrameAncestorsWasTheWholePolicy_ShouldDropTheHeader", () => {
        // Arrange
        const response = aResponseDraft({
            headers: [
                {
                    name: "content-security-policy",
                    value: "frame-ancestors 'self'",
                },
            ],
        });

        // Act
        const draft = ruleType.applyResponse(
            response,
            {
                keepCsp: true,
            },
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft.headers).toEqual([]);
    });

    test("applyResponse_WhenTheCspIsNotKept_ShouldRemoveBothHeaders", () => {
        // Arrange
        const action = {
            keepCsp: false,
        };

        // Act
        const draft = ruleType.applyResponse(
            aFramedResponse(),
            action,
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft.headers.map(header => header.name)).toEqual(["Content-Type"]);
    });

    test("toDnr_WhenTheCspIsNotKept_ShouldRemoveBothHeadersOnEveryTab", () => {
        // Arrange
        const action = {
            keepCsp: false,
        };

        // Act
        const rules = ruleType.toDnr(
            action,
            condition,
            aRuleContext()
        );

        // Assert
        expect(rules).toEqual({
            hasErrors: false,
            value: [
                {
                    action: {
                        type: "modifyHeaders",
                        responseHeaders: [
                            {
                                header: "X-Frame-Options",
                                operation: "remove",
                            },
                            {
                                header: "Content-Security-Policy",
                                operation: "remove",
                            },
                        ],
                    },
                    condition,
                },
            ],
        });
    });

    test("toDnr_WhenTheRestOfTheCspIsKept_ShouldSayItWorksOnTheInspectedTabOnly", () => {
        // Arrange
        const action = {
            keepCsp: true,
        };

        // Act
        const rules = ruleType.toDnr(
            action,
            condition,
            aRuleContext()
        );

        // Assert
        expect(rules).toEqual({
            hasErrors: true,
            error: "Keeping the rest of the Content-Security-Policy works on the inspected tab only. Turn it off to work on every tab.",
        });
    });

    test("defaultAction_WhenCreated_ShouldKeepTheRestOfTheCsp", () => {
        // Arrange
        const type = ruleType;

        // Act
        const action = type.defaultAction();

        // Assert
        expect(action).toEqual({
            keepCsp: true,
        });
        expect(type.summary(action)).toBe("remove X-Frame-Options and frame-ancestors");
    });
});
