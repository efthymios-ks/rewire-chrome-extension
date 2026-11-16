import { describe, expect, test } from 'vitest';
import { Result } from '../../../Results/Result';
import type { DnrCondition } from '../../Criteria/DnrCondition';
import { REGEX_DESTINATION_MESSAGES } from './RegexDestinationMessages';
import { REWRITE_MESSAGES } from './RewriteMessages';
import { RewriteRule } from './RewriteRule';
import { aCriterion, aRequestDraft, aRuleContext, criteriaOf, TEST_URLS } from '../../../../TestData';

const ruleType = new RewriteRule();
const USERS_REGEX = '^https://api\\.example\\.com/api/v1/users/(\\d+)/profile$';
const WRAPPED_USERS_REGEX = `^.*?(?:${USERS_REGEX}).*$`;
const DOMAIN_CONDITION: DnrCondition = {
    requestDomains: ['api.example.com'],
};

const REGEX_CRITERIA = criteriaOf(aCriterion({
    op: 'regex',
    value: USERS_REGEX,
}));
const WILDCARD_CRITERIA = criteriaOf(aCriterion());

describe('RewriteRule', () => {
    test('applyRequest_WhenTheTargetHasNoGroups_ShouldRewriteToTheTarget', () => {
        // Arrange
        const action = {
            target: 'http://localhost:5000/users',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context: aRuleContext(),
            criteria: WILDCARD_CRITERIA,
        });

        // Assert
        expect(draft.url).toBe('http://localhost:5000/users');
        expect(draft.response).toBeNull();
    });

    test('applyRequest_WhenTheTargetUsesGroupsOfAUrlRegexCondition_ShouldInsertThem', () => {
        // Arrange
        const action = {
            target: 'http://localhost:5000/users/$1',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context: aRuleContext(),
            criteria: REGEX_CRITERIA,
        });

        // Assert
        expect(draft.url).toBe('http://localhost:5000/users/42');
    });

    test('applyRequest_WhenTheRegexMatchesPartOfTheUrl_ShouldReplaceTheWholeUrl', () => {
        // Arrange
        const criteria = criteriaOf(aCriterion({
            op: 'regex',
            value: '/users/(\\d+)',
        }));
        const action = {
            target: 'http://localhost:5000/people/$1',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context: aRuleContext(),
            criteria,
        });

        // Assert
        expect(draft.url).toBe('http://localhost:5000/people/42');
    });

    test('applyRequest_WhenTheUrlDoesNotMatchTheRegex_ShouldLeaveTheUrl', () => {
        // Arrange
        const request = aRequestDraft({
            url: TEST_URLS.Orders,
        });
        const action = {
            target: 'http://localhost:5000/users/$1',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: request,
            action,
            context: aRuleContext(),
            criteria: REGEX_CRITERIA,
        });

        // Assert
        expect(draft.url).toBe(TEST_URLS.Orders);
    });

    test('applyRequest_WhenTheTargetUsesGroupsWithoutARegexCondition_ShouldLeaveTheUrl', () => {
        // Arrange
        const action = {
            target: 'http://localhost:5000/users/$1',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context: aRuleContext(),
            criteria: WILDCARD_CRITERIA,
        });

        // Assert
        expect(draft.url).toBe(TEST_URLS.UsersProfile);
    });

    test('applyRequest_WhenTheTargetHasAVariable_ShouldRenderItFirst', () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable('local', 'http://localhost:5001');
        const action = {
            target: '{{local}}/users/$1',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context,
            criteria: REGEX_CRITERIA,
        });

        // Assert
        expect(draft.url).toBe('http://localhost:5001/users/42');
    });

    test('validate_WhenTheTargetIsBlank_ShouldRequireIt', () => {
        // Arrange
        const action = ruleType.defaultAction();

        // Act
        const errors = ruleType.validate(action, WILDCARD_CRITERIA);

        // Assert
        expect(errors).toEqual(['To URL is required.']);
    });

    test('validate_WhenTheTargetUsesGroupsWithoutARegexCondition_ShouldAskForOne', () => {
        // Arrange
        const action = {
            target: 'http://localhost:5000/users/$1',
        };

        // Act
        const errors = ruleType.validate(action, WILDCARD_CRITERIA);

        // Assert
        expect(errors).toEqual([REGEX_DESTINATION_MESSAGES.GroupsNeedRegex]);
    });

    test('summary_WhenCalled_ShouldShowAnArrowAndTheTarget', () => {
        // Arrange
        const action = {
            target: 'http://localhost:5000',
        };

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe('-> http://localhost:5000');
    });

    test('toDnr_WhenTheTargetHasNoGroups_ShouldRedirectToTheUrl', () => {
        // Arrange
        const action = {
            target: 'http://localhost:5000/users',
        };

        // Act
        const result = ruleType.toDnr({
            action,
            condition: DOMAIN_CONDITION,
            context: aRuleContext(),
            criteria: WILDCARD_CRITERIA,
        });

        // Assert
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: 'redirect',
                    redirect: {
                        url: 'http://localhost:5000/users',
                    },
                },
                condition: DOMAIN_CONDITION,
            },
        ]));
    });

    test('toDnr_WhenTheTargetUsesGroupsOfTheRegexCondition_ShouldRedirectWithARegexSubstitution', () => {
        // Arrange
        const condition: DnrCondition = {
            regexFilter: USERS_REGEX,
        };
        const action = {
            target: 'http://localhost:5000/users/$1',
        };

        // Act
        const result = ruleType.toDnr({
            action,
            condition,
            context: aRuleContext(),
            criteria: REGEX_CRITERIA,
        });

        // Assert
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: 'redirect',
                    redirect: {
                        regexSubstitution: 'http://localhost:5000/users/\\1',
                    },
                },
                condition: {
                    regexFilter: WRAPPED_USERS_REGEX,
                },
            },
        ]));
    });

    test('toDnr_WhenTheTargetUsesGroupsWithoutARegexCondition_ShouldFail', () => {
        // Arrange
        const action = {
            target: 'http://localhost:5000/users/$1',
        };

        // Act
        const result = ruleType.toDnr({
            action,
            condition: DOMAIN_CONDITION,
            context: aRuleContext(),
            criteria: WILDCARD_CRITERIA,
        });

        // Assert
        expect(result).toEqual(Result.fail(REGEX_DESTINATION_MESSAGES.GroupsNeedRegex));
    });

    test('toDnr_WhenTheConditionRegexComesFromAnotherCondition_ShouldWorkOnTheInspectedTabOnly', () => {
        // Arrange
        const condition: DnrCondition = {
            regexFilter: '^[^?#]*\\.(?:json)(?:[?#].*)?$',
        };
        const action = {
            target: 'http://localhost:5000/users/$1',
        };

        // Act
        const result = ruleType.toDnr({
            action,
            condition,
            context: aRuleContext(),
            criteria: REGEX_CRITERIA,
        });

        // Assert
        expect(result).toEqual(Result.fail(REWRITE_MESSAGES.GroupsNeedOwnPattern));
    });

    test('toDnr_WhenTheTargetHasAVariable_ShouldRenderIt', () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable('local', 'http://localhost:5001');
        const action = {
            target: '{{local}}/users',
        };

        // Act
        const result = ruleType.toDnr({
            action,
            condition: DOMAIN_CONDITION,
            context,
            criteria: WILDCARD_CRITERIA,
        });

        // Assert
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: 'redirect',
                    redirect: {
                        url: 'http://localhost:5001/users',
                    },
                },
                condition: DOMAIN_CONDITION,
            },
        ]));
    });
});
