import { describe, expect, test } from "vitest";
import type { DnrCondition } from "../../../../../src/Common/Rules/Criteria/DnrFragment";
import { DefaultRedirectStatus, RedirectRule } from "../../../../../src/Common/Rules/Types/Url/RedirectRule";
import { RegexDestinationMessages } from "../../../../../src/Common/Rules/Types/Url/RegexDestination";
import { CriteriaMatches, type RuleCriteria } from "../../../../../src/Contracts/Rules/Criterion";
import { aCriterion, aRequestDraft, aRuleContext, TestUrls } from "../../../../TestData";

const ruleType = new RedirectRule();
const usersRegex = "^https://api\\.example\\.com/api/v1/users/(\\d+)/profile$";
const noCondition: DnrCondition = {};

function criteriaOf(...items: RuleCriteria["items"]): RuleCriteria {
    return {
        match: CriteriaMatches.All,
        items,
    };
}

const regexCriteria = criteriaOf(aCriterion({
    op: "regex",
    value: usersRegex,
}));
const wildcardCriteria = criteriaOf(aCriterion());

describe("RedirectRule", () => {
    test("applyRequest_WhenTheTargetHasNoGroups_ShouldAnswerWithALocationHeader", () => {
        // Arrange
        const action = {
            target: "https://example.com/moved",
            status: 308,
        };

        // Act
        const draft = ruleType.applyRequest(
            aRequestDraft(),
            action,
            aRuleContext(),
            wildcardCriteria
        );

        // Assert
        expect(draft.url).toBe(TestUrls.UsersProfile);
        expect(draft.response).toEqual({
            status: 308,
            headers: [
                {
                    name: "Location",
                    value: "https://example.com/moved",
                },
            ],
            body: "",
        });
    });

    test("applyRequest_WhenTheTargetUsesGroupsOfAUrlRegexCondition_ShouldInsertThemIntoLocation", () => {
        // Arrange
        const action = {
            target: "https://example.com/users/$1",
            status: 301,
        };

        // Act
        const draft = ruleType.applyRequest(
            aRequestDraft(),
            action,
            aRuleContext(),
            regexCriteria
        );

        // Assert
        expect(draft.response?.headers[0]?.value).toBe("https://example.com/users/42");
    });

    test("applyRequest_WhenTheUrlDoesNotMatchTheRegex_ShouldLeaveTheRequest", () => {
        // Arrange
        const request = aRequestDraft({
            url: TestUrls.Orders,
        });
        const action = {
            target: "https://example.com/users/$1",
            status: 302,
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext(),
            regexCriteria
        );

        // Assert
        expect(draft.url).toBe(TestUrls.Orders);
        expect(draft.response).toBeNull();
    });

    test("applyRequest_WhenTheTargetUsesGroupsWithoutARegexCondition_ShouldLeaveTheRequest", () => {
        // Arrange
        const action = {
            target: "https://example.com/users/$1",
            status: 307,
        };

        // Act
        const draft = ruleType.applyRequest(
            aRequestDraft(),
            action,
            aRuleContext(),
            wildcardCriteria
        );

        // Assert
        expect(draft.response).toBeNull();
    });

    test("applyRequest_WhenTheTargetHasAVariable_ShouldRenderItFirst", () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable("origin", "https://cdn.example.com");
        const action = {
            target: "{{origin}}/users/$1",
            status: 303,
        };

        // Act
        const draft = ruleType.applyRequest(
            aRequestDraft(),
            action,
            context,
            regexCriteria
        );

        // Assert
        expect(draft.response?.headers[0]?.value).toBe("https://cdn.example.com/users/42");
    });

    test.each([
        [
            301,
            301,
        ],
        [
            "308",
            308,
        ],
        [
            302,
            302,
        ],
        [
            299,
            DefaultRedirectStatus,
        ],
        [
            "abc",
            DefaultRedirectStatus,
        ],
    ])("read_WhenStatusIs(%s)_ShouldNormaliseTo(%s)", (status, expected) => {
        // Arrange
        const action = {
            target: "https://example.com/moved",
            status,
        };

        // Act
        const draft = ruleType.applyRequest(
            aRequestDraft(),
            action,
            aRuleContext(),
            wildcardCriteria
        );

        // Assert
        expect(draft.response?.status).toBe(expected);
    });

    test("validate_WhenTheTargetIsBlank_ShouldRequireIt", () => {
        // Arrange
        const action = ruleType.defaultAction();

        // Act
        const errors = ruleType.validate(action, wildcardCriteria);

        // Assert
        expect(errors).toEqual(["Location URL is required."]);
    });

    test("validate_WhenTheTargetUsesGroupsWithoutARegexCondition_ShouldAskForOne", () => {
        // Arrange
        const action = {
            target: "https://example.com/users/$1",
            status: DefaultRedirectStatus,
        };

        // Act
        const errors = ruleType.validate(action, wildcardCriteria);

        // Assert
        expect(errors).toEqual([RegexDestinationMessages.GroupsNeedRegex]);
    });

    test("validate_WhenTheTargetUsesAMissingGroup_ShouldReportIt", () => {
        // Arrange
        const action = {
            target: "https://example.com/users/$2",
            status: DefaultRedirectStatus,
        };

        // Act
        const errors = ruleType.validate(action, regexCriteria);

        // Assert
        expect(errors).toEqual(["Template uses $2, but the regex has 1 capture group(s)."]);
    });

    test("validate_WhenTheTargetUsesGroupsOfARegexCondition_ShouldPass", () => {
        // Arrange
        const action = {
            target: "https://example.com/users/$1",
            status: DefaultRedirectStatus,
        };

        // Act
        const errors = ruleType.validate(action, regexCriteria);

        // Assert
        expect(errors).toEqual([]);
    });

    test("summary_WhenCalled_ShouldShowTheStatusAndTarget", () => {
        // Arrange
        const action = {
            target: "https://example.com/moved",
            status: 308,
        };

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe("308 -> https://example.com/moved");
    });

    test("defaultAction_WhenCalled_ShouldUse308", () => {
        // Arrange
        const expected = 308;

        // Act
        const action = ruleType.defaultAction();

        // Assert
        expect(action["status"]).toBe(expected);
    });

    test("toDnr_WhenCalled_ShouldNeedTheDebugger", () => {
        // Arrange
        const action = {
            target: "https://example.com/moved",
            status: 308,
        };

        // Act
        const result = ruleType.toDnr(
            action,
            noCondition,
            aRuleContext(),
            wildcardCriteria
        );

        // Assert
        expect(result).toBeNull();
    });
});
