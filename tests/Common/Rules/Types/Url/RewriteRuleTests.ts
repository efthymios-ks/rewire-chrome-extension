import { describe, expect, test } from "vitest";
import { Result } from "../../../../../src/Common/Results/Result";
import type { DnrCondition } from "../../../../../src/Common/Rules/Criteria/DnrFragment";
import { RegexDestinationMessages } from "../../../../../src/Common/Rules/Types/Url/RegexDestination";
import { RewriteMessages, RewriteRule } from "../../../../../src/Common/Rules/Types/Url/RewriteRule";
import { CriteriaMatches, type RuleCriteria } from "../../../../../src/Contracts/Rules/Criterion";
import { aCriterion, aRequestDraft, aRuleContext, TestUrls } from "../../../../TestData";

const ruleType = new RewriteRule();
const usersRegex = "^https://api\\.example\\.com/api/v1/users/(\\d+)/profile$";
const wrappedUsersRegex = `^.*?(?:${usersRegex}).*$`;
const domainCondition: DnrCondition = {
    requestDomains: ["api.example.com"],
};

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

describe("RewriteRule", () => {
    test("applyRequest_WhenTheTargetHasNoGroups_ShouldRewriteToTheTarget", () => {
        // Arrange
        const action = {
            target: "http://localhost:5000/users",
        };

        // Act
        const draft = ruleType.applyRequest(
            aRequestDraft(),
            action,
            aRuleContext(),
            wildcardCriteria
        );

        // Assert
        expect(draft.url).toBe("http://localhost:5000/users");
        expect(draft.response).toBeNull();
    });

    test("applyRequest_WhenTheTargetUsesGroupsOfAUrlRegexCondition_ShouldInsertThem", () => {
        // Arrange
        const action = {
            target: "http://localhost:5000/users/$1",
        };

        // Act
        const draft = ruleType.applyRequest(
            aRequestDraft(),
            action,
            aRuleContext(),
            regexCriteria
        );

        // Assert
        expect(draft.url).toBe("http://localhost:5000/users/42");
    });

    test("applyRequest_WhenTheRegexMatchesPartOfTheUrl_ShouldReplaceTheWholeUrl", () => {
        // Arrange
        const criteria = criteriaOf(aCriterion({
            op: "regex",
            value: "/users/(\\d+)",
        }));
        const action = {
            target: "http://localhost:5000/people/$1",
        };

        // Act
        const draft = ruleType.applyRequest(
            aRequestDraft(),
            action,
            aRuleContext(),
            criteria
        );

        // Assert
        expect(draft.url).toBe("http://localhost:5000/people/42");
    });

    test("applyRequest_WhenTheUrlDoesNotMatchTheRegex_ShouldLeaveTheUrl", () => {
        // Arrange
        const request = aRequestDraft({
            url: TestUrls.Orders,
        });
        const action = {
            target: "http://localhost:5000/users/$1",
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
    });

    test("applyRequest_WhenTheTargetUsesGroupsWithoutARegexCondition_ShouldLeaveTheUrl", () => {
        // Arrange
        const action = {
            target: "http://localhost:5000/users/$1",
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
    });

    test("applyRequest_WhenTheTargetHasAVariable_ShouldRenderItFirst", () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable("local", "http://localhost:5001");
        const action = {
            target: "{{local}}/users/$1",
        };

        // Act
        const draft = ruleType.applyRequest(
            aRequestDraft(),
            action,
            context,
            regexCriteria
        );

        // Assert
        expect(draft.url).toBe("http://localhost:5001/users/42");
    });

    test("validate_WhenTheTargetIsBlank_ShouldRequireIt", () => {
        // Arrange
        const action = ruleType.defaultAction();

        // Act
        const errors = ruleType.validate(action, wildcardCriteria);

        // Assert
        expect(errors).toEqual(["To URL is required."]);
    });

    test("validate_WhenTheTargetUsesGroupsWithoutARegexCondition_ShouldAskForOne", () => {
        // Arrange
        const action = {
            target: "http://localhost:5000/users/$1",
        };

        // Act
        const errors = ruleType.validate(action, wildcardCriteria);

        // Assert
        expect(errors).toEqual([RegexDestinationMessages.GroupsNeedRegex]);
    });

    test("summary_WhenCalled_ShouldShowAnArrowAndTheTarget", () => {
        // Arrange
        const action = {
            target: "http://localhost:5000",
        };

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe("-> http://localhost:5000");
    });

    test("toDnr_WhenTheTargetHasNoGroups_ShouldRedirectToTheUrl", () => {
        // Arrange
        const action = {
            target: "http://localhost:5000/users",
        };

        // Act
        const result = ruleType.toDnr(
            action,
            domainCondition,
            aRuleContext(),
            wildcardCriteria
        );

        // Assert
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: "redirect",
                    redirect: {
                        url: "http://localhost:5000/users",
                    },
                },
                condition: domainCondition,
            },
        ]));
    });

    test("toDnr_WhenTheTargetUsesGroupsOfTheRegexCondition_ShouldRedirectWithARegexSubstitution", () => {
        // Arrange
        const condition: DnrCondition = {
            regexFilter: usersRegex,
        };
        const action = {
            target: "http://localhost:5000/users/$1",
        };

        // Act
        const result = ruleType.toDnr(
            action,
            condition,
            aRuleContext(),
            regexCriteria
        );

        // Assert
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: "redirect",
                    redirect: {
                        regexSubstitution: "http://localhost:5000/users/\\1",
                    },
                },
                condition: {
                    regexFilter: wrappedUsersRegex,
                },
            },
        ]));
    });

    test("toDnr_WhenTheTargetUsesGroupsWithoutARegexCondition_ShouldFail", () => {
        // Arrange
        const action = {
            target: "http://localhost:5000/users/$1",
        };

        // Act
        const result = ruleType.toDnr(
            action,
            domainCondition,
            aRuleContext(),
            wildcardCriteria
        );

        // Assert
        expect(result).toEqual(Result.fail(RegexDestinationMessages.GroupsNeedRegex));
    });

    test("toDnr_WhenTheConditionRegexComesFromAnotherCondition_ShouldWorkOnTheInspectedTabOnly", () => {
        // Arrange
        const condition: DnrCondition = {
            regexFilter: "^[^?#]*\\.(?:json)(?:[?#].*)?$",
        };
        const action = {
            target: "http://localhost:5000/users/$1",
        };

        // Act
        const result = ruleType.toDnr(
            action,
            condition,
            aRuleContext(),
            regexCriteria
        );

        // Assert
        expect(result).toEqual(Result.fail(RewriteMessages.GroupsNeedOwnPattern));
    });

    test("toDnr_WhenTheTargetHasAVariable_ShouldRenderIt", () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable("local", "http://localhost:5001");
        const action = {
            target: "{{local}}/users",
        };

        // Act
        const result = ruleType.toDnr(
            action,
            domainCondition,
            context,
            wildcardCriteria
        );

        // Assert
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: "redirect",
                    redirect: {
                        url: "http://localhost:5001/users",
                    },
                },
                condition: domainCondition,
            },
        ]));
    });
});
