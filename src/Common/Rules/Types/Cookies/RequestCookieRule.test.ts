import { describe, expect, test } from 'vitest';
import type { DnrCondition } from '../../Criteria/DnrCondition';
import { RequestCookieRule } from './RequestCookieRule';
import { OPERATION_KINDS } from '../OperationKinds';
import { aRequestDraft, aRuleContext } from '../../../../TestData';

const ruleType = new RequestCookieRule();
const CONDITION: DnrCondition = {
    urlFilter: '||api.example.com',
};

describe('RequestCookieRule', () => {
    test('applyRequest_WhenThereIsNoCookieHeader_ShouldAddOne', () => {
        // Arrange
        const action = {
            op: OPERATION_KINDS.AddOrUpdate,
            name: 'session',
            value: 'abc',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context: aRuleContext(),
        });

        // Assert
        expect(draft.headers).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
            {
                name: 'Cookie',
                value: 'session=abc',
            },
        ]);
    });

    test('applyRequest_WhenAddOrUpdateAndTheCookieIsAlreadySent_ShouldReplaceItAndKeepTheOthers', () => {
        // Arrange
        const request = aRequestDraft({
            headers: [
                {
                    name: 'cookie',
                    value: 'theme=dark; session=old; lang=en',
                },
            ],
        });
        const action = {
            op: OPERATION_KINDS.AddOrUpdate,
            name: 'session',
            value: 'new',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: request,
            action,
            context: aRuleContext(),
        });

        // Assert
        expect(draft.headers).toEqual([
            {
                name: 'Cookie',
                value: 'theme=dark; lang=en; session=new',
            },
        ]);
    });

    test('applyRequest_WhenAddAndTheCookieIsAlreadySent_ShouldSendItTwice', () => {
        // Arrange
        const request = aRequestDraft({
            headers: [
                {
                    name: 'Cookie',
                    value: 'session=old',
                },
            ],
        });
        const action = {
            op: OPERATION_KINDS.Add,
            name: 'session',
            value: 'new',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: request,
            action,
            context: aRuleContext(),
        });

        // Assert
        expect(draft.headers).toEqual([
            {
                name: 'Cookie',
                value: 'session=old; session=new',
            },
        ]);
    });

    test('applyRequest_WhenAddIfMissingAndTheCookieIsAlreadySent_ShouldKeepIt', () => {
        // Arrange
        const request = aRequestDraft({
            headers: [
                {
                    name: 'Cookie',
                    value: 'theme=dark; session=old',
                },
            ],
        });
        const action = {
            op: OPERATION_KINDS.AddIfMissing,
            name: 'session',
            value: 'new',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: request,
            action,
            context: aRuleContext(),
        });

        // Assert
        expect(draft.headers).toEqual([
            {
                name: 'Cookie',
                value: 'theme=dark; session=old',
            },
        ]);
    });

    test('applyRequest_WhenAddIfMissingAndTheCookieIsAlreadySent_ShouldLeaveTheHeaderAsWritten', () => {
        // Arrange
        const request = aRequestDraft({
            headers: [
                {
                    name: 'Cookie',
                    value: 'theme=dark;session=old;flag',
                },
            ],
        });
        const action = {
            op: OPERATION_KINDS.AddIfMissing,
            name: 'session',
            value: 'new',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: request,
            action,
            context: aRuleContext(),
        });

        // Assert
        expect(draft.headers).toEqual(request.headers);
    });

    test('applyRequest_WhenAddIfMissingAndTheCookieIsMissing_ShouldAddIt', () => {
        // Arrange
        const request = aRequestDraft({
            headers: [
                {
                    name: 'Cookie',
                    value: 'theme=dark',
                },
            ],
        });
        const action = {
            op: OPERATION_KINDS.AddIfMissing,
            name: 'session',
            value: 'new',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: request,
            action,
            context: aRuleContext(),
        });

        // Assert
        expect(draft.headers).toEqual([
            {
                name: 'Cookie',
                value: 'theme=dark; session=new',
            },
        ]);
    });

    test('applyRequest_WhenOperationIsRemove_ShouldDropOnlyThatCookie', () => {
        // Arrange
        const request = aRequestDraft({
            headers: [
                {
                    name: 'Cookie',
                    value: 'theme=dark; session=old',
                },
            ],
        });
        const action = {
            op: OPERATION_KINDS.Remove,
            name: 'session',
            value: '',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: request,
            action,
            context: aRuleContext(),
        });

        // Assert
        expect(draft.headers).toEqual([
            {
                name: 'Cookie',
                value: 'theme=dark',
            },
        ]);
    });

    test('applyRequest_WhenRemovingTheLastCookie_ShouldDropTheCookieHeader', () => {
        // Arrange
        const request = aRequestDraft({
            headers: [
                {
                    name: 'Cookie',
                    value: 'session=old',
                },
            ],
        });
        const action = {
            op: OPERATION_KINDS.Remove,
            name: 'session',
            value: '',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: request,
            action,
            context: aRuleContext(),
        });

        // Assert
        expect(draft.headers).toEqual([]);
    });

    test('applyRequest_WhenValueIsATemplate_ShouldRenderTheVariable', () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable('sessionId', 's-42');
        const action = {
            op: OPERATION_KINDS.AddOrUpdate,
            name: 'session',
            value: '{{sessionId}}',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context,
        });

        // Assert
        expect(draft.headers).toContainEqual({
            name: 'Cookie',
            value: 'session=s-42',
        });
    });

    test('validate_WhenNameIsBlank_ShouldRequireIt', () => {
        // Arrange
        const action = {
            op: OPERATION_KINDS.AddOrUpdate,
            name: ' ',
            value: 'abc',
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(['Cookie name is required.']);
    });

    test.each([
        [
            OPERATION_KINDS.AddOrUpdate,
            'session=abc',
        ],
        [
            OPERATION_KINDS.Remove,
            'remove session',
        ],
    ])('summary_WhenOperationIs(%s)_ShouldDescribeIt', (op, expected) => {
        // Arrange
        const action = {
            op,
            name: 'session',
            value: 'abc',
        };

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe(expected);
    });

    test('withoutSecrets_WhenCalled_ShouldBlankTheValue', () => {
        // Arrange
        const action = {
            op: OPERATION_KINDS.AddOrUpdate,
            name: 'session',
            value: 'abc',
        };

        // Act
        const stripped = ruleType.withoutSecrets(action);

        // Assert
        expect(stripped).toEqual({
            op: OPERATION_KINDS.AddOrUpdate,
            name: 'session',
            value: '',
        });
    });

    test('defaultAction_WhenCreated_ShouldAddOrUpdate', () => {
        // Arrange
        const expected = OPERATION_KINDS.AddOrUpdate;

        // Act
        const action = ruleType.defaultAction();

        // Assert
        expect(action['op']).toBe(expected);
    });

    test('toDnr_WhenCalled_ShouldWorkOnTheInspectedTabOnly', () => {
        // Arrange
        const action = {
            op: OPERATION_KINDS.AddOrUpdate,
            name: 'session',
            value: 'abc',
        };

        // Act
        const result = ruleType.toDnr({
            action,
            condition: CONDITION,
            context: aRuleContext(),
        });

        // Assert
        expect(result).toBeNull();
    });

    test('applyRequest_WhenTheOperationIsAnObjectPrototypeName_ShouldAddOrUpdate', () => {
        // Arrange
        const action = {
            op: 'toString',
            name: 'session',
            value: 'abc',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context: aRuleContext(),
        });

        // Assert
        expect(draft.headers).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
            {
                name: 'Cookie',
                value: 'session=abc',
            },
        ]);
    });
});
