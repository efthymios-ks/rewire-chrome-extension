import { describe, expect, test } from "vitest";
import { Result } from "../../../../../src/Common/Results/Result";
import type { DnrCondition } from "../../../../../src/Common/Rules/Criteria/DnrFragment";
import { UpgradeSchemeRule } from "../../../../../src/Common/Rules/Types/Url/UpgradeSchemeRule";
import { aRequestDraft, aRuleContext, TestUrls } from "../../../../TestData";

const ruleType = new UpgradeSchemeRule();
const condition: DnrCondition = {
    urlFilter: "|http://api.example.com",
};

describe("UpgradeSchemeRule", () => {
    test.each([
        [
            "http://api.example.com/api/v1/orders?page=2",
            "https://api.example.com/api/v1/orders?page=2",
        ],
        [
            "http://localhost:8080/health",
            "https://localhost:8080/health",
        ],
        [
            TestUrls.UsersProfile,
            TestUrls.UsersProfile,
        ],
        [
            "ws://api.example.com/socket",
            "ws://api.example.com/socket",
        ],
    ])("applyRequest_WhenUrlIs(%s)_ShouldBecome(%s)", (url, expected) => {
        // Arrange
        const request = aRequestDraft({
            url,
        });
        const action = ruleType.defaultAction();

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.url).toBe(expected);
    });

    test("validate_WhenActionIsEmpty_ShouldPass", () => {
        // Arrange
        const action = ruleType.defaultAction();

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual([]);
    });

    test("summary_WhenCalled_ShouldDescribeTheUpgrade", () => {
        // Arrange
        const action = ruleType.defaultAction();

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe("http -> https");
    });

    test("toDnr_WhenCalled_ShouldEmitAnUpgradeSchemeRule", () => {
        // Arrange
        const action = ruleType.defaultAction();

        // Act
        const result = ruleType.toDnr(
            action,
            condition,
            aRuleContext()
        );

        // Assert
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: "upgradeScheme",
                },
                condition,
            },
        ]));
    });
});
