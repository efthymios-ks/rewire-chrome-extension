import { describe, expect, test } from 'vitest';
import type { DnrCondition } from '../../Criteria/DnrCondition';
import { DEFAULT_REDIRECT_STATUS } from './DefaultRedirectStatus';
import { RedirectRule } from './RedirectRule';
import { REGEX_DESTINATION_MESSAGES } from './RegexDestinationMessages';
import { aCriterion, aRequestDraft, aRuleContext, criteriaOf, TEST_URLS } from '../../../../TestData';

const ruleType = new RedirectRule();
const USERS_REGEX = '^https://api\\.example\\.com/api/v1/users/(\\d+)/profile$';
const NO_CONDITION: DnrCondition = {};

const REGEX_CRITERIA = criteriaOf(aCriterion({
    op: 'regex',
    value: USERS_REGEX,
}));
const WILDCARD_CRITERIA = criteriaOf(aCriterion());

describe('RedirectRule', () => {
    test('applyRequest_WhenTheTargetHasNoGroups_ShouldAnswerWithALocationHeader', () => {
        // Arrange
        const action = {
            target: 'https://example.com/moved',
            status: 308,
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
        expect(draft.response).toEqual({
            status: 308,
            headers: [
                {
                    name: 'Location',
                    value: 'https://example.com/moved',
                },
            ],
            body: '',
        });
    });

    test('applyRequest_WhenTheTargetUsesGroupsOfAUrlRegexCondition_ShouldInsertThemIntoLocation', () => {
        // Arrange
        const action = {
            target: 'https://example.com/users/$1',
            status: 301,
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context: aRuleContext(),
            criteria: REGEX_CRITERIA,
        });

        // Assert
        expect(draft.response?.headers[0]?.value).toBe('https://example.com/users/42');
    });

    test('applyRequest_WhenTheUrlDoesNotMatchTheRegex_ShouldLeaveTheRequest', () => {
        // Arrange
        const request = aRequestDraft({
            url: TEST_URLS.Orders,
        });
        const action = {
            target: 'https://example.com/users/$1',
            status: 302,
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
        expect(draft.response).toBeNull();
    });

    test('applyRequest_WhenTheTargetUsesGroupsWithoutARegexCondition_ShouldLeaveTheRequest', () => {
        // Arrange
        const action = {
            target: 'https://example.com/users/$1',
            status: 307,
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context: aRuleContext(),
            criteria: WILDCARD_CRITERIA,
        });

        // Assert
        expect(draft.response).toBeNull();
    });

    test('applyRequest_WhenTheTargetHasAVariable_ShouldRenderItFirst', () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable('origin', 'https://cdn.example.com');
        const action = {
            target: '{{origin}}/users/$1',
            status: 303,
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context,
            criteria: REGEX_CRITERIA,
        });

        // Assert
        expect(draft.response?.headers[0]?.value).toBe('https://cdn.example.com/users/42');
    });

    test.each([
        [
            301,
            301,
        ],
        [
            '308',
            308,
        ],
        [
            302,
            302,
        ],
        [
            299,
            DEFAULT_REDIRECT_STATUS,
        ],
        [
            'abc',
            DEFAULT_REDIRECT_STATUS,
        ],
    ])('read_WhenStatusIs(%s)_ShouldNormaliseTo(%s)', (status, expected) => {
        // Arrange
        const action = {
            target: 'https://example.com/moved',
            status,
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context: aRuleContext(),
            criteria: WILDCARD_CRITERIA,
        });

        // Assert
        expect(draft.response?.status).toBe(expected);
    });

    test('validate_WhenTheTargetIsBlank_ShouldRequireIt', () => {
        // Arrange
        const action = ruleType.defaultAction();

        // Act
        const errors = ruleType.validate(action, WILDCARD_CRITERIA);

        // Assert
        expect(errors).toEqual(['Location URL is required.']);
    });

    test('validate_WhenTheTargetUsesGroupsWithoutARegexCondition_ShouldAskForOne', () => {
        // Arrange
        const action = {
            target: 'https://example.com/users/$1',
            status: DEFAULT_REDIRECT_STATUS,
        };

        // Act
        const errors = ruleType.validate(action, WILDCARD_CRITERIA);

        // Assert
        expect(errors).toEqual([REGEX_DESTINATION_MESSAGES.GroupsNeedRegex]);
    });

    test('validate_WhenTheTargetUsesAMissingGroup_ShouldReportIt', () => {
        // Arrange
        const action = {
            target: 'https://example.com/users/$2',
            status: DEFAULT_REDIRECT_STATUS,
        };

        // Act
        const errors = ruleType.validate(action, REGEX_CRITERIA);

        // Assert
        expect(errors).toEqual(['Template uses $2, but the regex has 1 capture group(s).']);
    });

    test('validate_WhenTheTargetUsesGroupsOfARegexCondition_ShouldPass', () => {
        // Arrange
        const action = {
            target: 'https://example.com/users/$1',
            status: DEFAULT_REDIRECT_STATUS,
        };

        // Act
        const errors = ruleType.validate(action, REGEX_CRITERIA);

        // Assert
        expect(errors).toEqual([]);
    });

    test('summary_WhenCalled_ShouldShowTheStatusAndTarget', () => {
        // Arrange
        const action = {
            target: 'https://example.com/moved',
            status: 308,
        };

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe('308 -> https://example.com/moved');
    });

    test('defaultAction_WhenCalled_ShouldUse308', () => {
        // Arrange
        const expected = 308;

        // Act
        const action = ruleType.defaultAction();

        // Assert
        expect(action['status']).toBe(expected);
    });

    test('toDnr_WhenCalled_ShouldNeedTheDebugger', () => {
        // Arrange
        const action = {
            target: 'https://example.com/moved',
            status: 308,
        };

        // Act
        const result = ruleType.toDnr({
            action,
            condition: NO_CONDITION,
            context: aRuleContext(),
            criteria: WILDCARD_CRITERIA,
        });

        // Assert
        expect(result).toBeNull();
    });
});
