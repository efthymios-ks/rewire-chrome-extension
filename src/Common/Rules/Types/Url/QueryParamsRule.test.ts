import { describe, expect, test } from 'vitest';
import { Result } from '../../../Results/Result';
import type { DnrCondition } from '../../Criteria/DnrCondition';
import { OPERATION_KINDS } from '../OperationKinds';
import { QUERY_PARAMS_MESSAGES } from './QueryParamsMessages';
import { QueryParamsRule } from './QueryParamsRule';
import { aRequestDraft, aRuleContext, TEST_URLS } from '../../../../TestData';

const ruleType = new QueryParamsRule();
const CONDITION: DnrCondition = {
    requestDomains: ['api.example.com'],
};

interface OperationOptions {
    op: string;
    name: string;
    value?: string;
}

function operation({ op, name, value = '' }: OperationOptions): Record<string, string> {
    return {
        op,
        name,
        value,
    };
}

function urlAfter(url: string, operations: Record<string, string>[]): string {
    return ruleType.applyRequest({
        draft: aRequestDraft({
            url,
        }),
        action: {
            operations,
        },
        context: aRuleContext(),
    }).url;
}

describe('QueryParamsRule', () => {
    test('applyRequest_WhenAddAndTheKeyIsThere_ShouldAppendAnotherValue', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.Add, name: 'page', value: '3' }),
        ];

        // Act
        const url = urlAfter(TEST_URLS.Orders, operations);

        // Assert
        expect(url).toBe('https://api.example.com/api/v1/orders?page=2&page=3');
    });

    test('applyRequest_WhenAddAndTheKeyIsNew_ShouldAppendIt', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.Add, name: 'debug', value: 'true' }),
        ];

        // Act
        const url = urlAfter(TEST_URLS.Orders, operations);

        // Assert
        expect(url).toBe('https://api.example.com/api/v1/orders?page=2&debug=true');
    });

    test('applyRequest_WhenAddIfMissingAndTheKeyIsThere_ShouldKeepIt', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.AddIfMissing, name: 'page', value: '3' }),
        ];

        // Act
        const url = urlAfter(TEST_URLS.Orders, operations);

        // Assert
        expect(url).toBe(TEST_URLS.Orders);
    });

    test('applyRequest_WhenAddIfMissingAndTheKeyIsNew_ShouldAppendIt', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.AddIfMissing, name: 'debug', value: 'true' }),
        ];

        // Act
        const url = urlAfter(TEST_URLS.Orders, operations);

        // Assert
        expect(url).toBe('https://api.example.com/api/v1/orders?page=2&debug=true');
    });

    test('applyRequest_WhenAddOrUpdateAndTheKeyIsThere_ShouldReplaceItsValue', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'page', value: '3' }),
        ];

        // Act
        const url = urlAfter(TEST_URLS.Orders, operations);

        // Assert
        expect(url).toBe('https://api.example.com/api/v1/orders?page=3');
    });

    test('applyRequest_WhenAddOrUpdateAndTheKeyIsNew_ShouldAppendIt', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'debug', value: 'true' }),
        ];

        // Act
        const url = urlAfter(TEST_URLS.Orders, operations);

        // Assert
        expect(url).toBe('https://api.example.com/api/v1/orders?page=2&debug=true');
    });

    test('applyRequest_WhenRemoveWithExactKeys_ShouldStripOnlyThoseKeys', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.Remove, name: 'fbclid' }),
            operation({ op: OPERATION_KINDS.Remove, name: 'gclid' }),
        ];

        // Act
        const url = urlAfter('https://api.example.com/api/v1/orders?page=2&fbclid=abc&gclid=def', operations);

        // Assert
        expect(url).toBe(TEST_URLS.Orders);
    });

    test('applyRequest_WhenRemoveWithAWildcardKey_ShouldStripEveryMatchingKey', () => {
        // Arrange
        const operations = [operation({ op: OPERATION_KINDS.Remove, name: 'utm_*' })];

        // Act
        const url = urlAfter(
            /* url: */ 'https://api.example.com/api/v1/orders?utm_source=mail&page=2&utm_medium=email',
            /* operations: */ operations,
        );

        // Assert
        expect(url).toBe(TEST_URLS.Orders);
    });

    test('applyRequest_WhenTheValueHasAVariable_ShouldRenderIt', () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable('tenant', 'blue');
        const request = aRequestDraft({
            url: TEST_URLS.Orders,
        });
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'tenant', value: '{{tenant}}' }),
            ],
        };

        // Act
        const draft = ruleType.applyRequest({ draft: request, action, context });

        // Assert
        expect(draft.url).toBe('https://api.example.com/api/v1/orders?page=2&tenant=blue');
    });

    test('applyRequest_WhenOperationsChain_ShouldApplyThemInOrder', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'page', value: '5' }),
            operation({ op: OPERATION_KINDS.Remove, name: 'fbclid' }),
        ];

        // Act
        const url = urlAfter('https://api.example.com/api/v1/orders?page=2&fbclid=abc', operations);

        // Assert
        expect(url).toBe('https://api.example.com/api/v1/orders?page=5');
    });

    test('defaultAction_WhenCreated_ShouldStartWithOneBlankAddOrUpdateRow', () => {
        // Arrange
        const expected = [
            {
                op: OPERATION_KINDS.AddOrUpdate,
                name: '',
                value: '',
            },
        ];

        // Act
        const action = ruleType.defaultAction();

        // Assert
        expect(action['operations']).toEqual(expected);
    });

    test('validate_WhenThereAreNoOperations_ShouldAskForOne', () => {
        // Arrange
        const action = {
            operations: [],
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(['Add at least one param.']);
    });

    test('validate_WhenAParamIsBlank_ShouldRequireIt', () => {
        // Arrange
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.AddOrUpdate, name: ' ', value: '1' }),
            ],
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(['Param is required.']);
    });

    test('summary_WhenOperationsAreSet_ShouldListThem', () => {
        // Arrange
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'page', value: '1' }),
                operation({ op: OPERATION_KINDS.Remove, name: 'fbclid' }),
            ],
        };

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe('addOrUpdate page, remove fbclid');
    });

    test('toDnr_WhenAddOrUpdateAndRemove_ShouldEmitOneQueryTransform', () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable('tenant', 'blue');
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'tenant', value: '{{tenant}}' }),
                operation({ op: OPERATION_KINDS.Remove, name: 'fbclid' }),
            ],
        };

        // Act
        const result = ruleType.toDnr({ action, condition: CONDITION, context });

        // Assert
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: 'redirect',
                    redirect: {
                        transform: {
                            queryTransform: {
                                removeParams: ['fbclid'],
                                addOrReplaceParams: [
                                    {
                                        key: 'tenant',
                                        value: 'blue',
                                        replaceOnly: false,
                                    },
                                ],
                            },
                        },
                    },
                },
                condition: CONDITION,
            },
        ]));
    });

    test('toDnr_WhenOnlyRemoving_ShouldRedirectOnlyWhenAKeyIsThere', () => {
        // Arrange
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.Remove, name: 'fbclid' }),
                operation({ op: OPERATION_KINDS.Remove, name: 'mc.eid' }),
            ],
        };

        // Act
        const result = ruleType.toDnr({
            action,
            condition: CONDITION,
            context: aRuleContext(),
        });

        // Assert
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: 'redirect',
                    redirect: {
                        transform: {
                            queryTransform: {
                                removeParams: [
                                    'fbclid',
                                    'mc.eid',
                                ],
                            },
                        },
                    },
                },
                condition: {
                    requestDomains: ['api.example.com'],
                    regexFilter: '[?&](?:fbclid|mc\\.eid)(?:=|&|#|$)',
                },
            },
        ]));
    });

    test('toDnr_WhenOnlyRemovingAKeyWithBrackets_ShouldFindItTypedOrEncoded', () => {
        // Arrange
        const action = {
            operations: [operation({ op: OPERATION_KINDS.Remove, name: 'ids[]' })],
        };

        // Act
        const result = ruleType.toDnr({
            action,
            condition: CONDITION,
            context: aRuleContext(),
        });

        // Assert
        if (result == null || result.hasErrors) {
            throw new Error('The rule did not compile for the browser.');
        }

        const regex = new RegExp(result.value[0]?.condition.regexFilter ?? '', 'i');
        expect(regex.test('https://api.example.com/search?ids[]=1')).toBe(true);
        expect(regex.test('https://api.example.com/search?ids%5B%5D=1')).toBe(true);
        expect(regex.test('https://api.example.com/search?idsx=1')).toBe(false);
    });

    test('toDnr_WhenOnlyRemovingAndTheConditionHasARegex_ShouldWorkOnTheInspectedTabOnly', () => {
        // Arrange
        const regexCondition: DnrCondition = {
            regexFilter: '/users/\\d+',
        };
        const action = {
            operations: [operation({ op: OPERATION_KINDS.Remove, name: 'fbclid' })],
        };

        // Act
        const result = ruleType.toDnr({
            action,
            condition: regexCondition,
            context: aRuleContext(),
        });

        // Assert
        expect(result).toEqual(Result.fail(QUERY_PARAMS_MESSAGES.OwnUrlPattern));
    });

    test('toDnr_WhenAddingOrUpdatingAndTheConditionHasARegex_ShouldKeepTheCondition', () => {
        // Arrange
        const regexCondition: DnrCondition = {
            regexFilter: '/users/\\d+',
        };
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'debug', value: '1' }),
            ],
        };

        // Act
        const result = ruleType.toDnr({
            action,
            condition: regexCondition,
            context: aRuleContext(),
        });

        // Assert
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: 'redirect',
                    redirect: {
                        transform: {
                            queryTransform: {
                                addOrReplaceParams: [
                                    {
                                        key: 'debug',
                                        value: '1',
                                        replaceOnly: false,
                                    },
                                ],
                            },
                        },
                    },
                },
                condition: regexCondition,
            },
        ]));
    });

    test.each([
        OPERATION_KINDS.Add,
        OPERATION_KINDS.AddIfMissing,
    ])('toDnr_WhenTheOperationIs(%s)_ShouldWorkOnTheInspectedTabOnly', kind => {
        // Arrange
        const action = {
            operations: [
                operation({ op: kind, name: 'debug', value: '1' }),
            ],
        };

        // Act
        const result = ruleType.toDnr({
            action,
            condition: CONDITION,
            context: aRuleContext(),
        });

        // Assert
        expect(result).toEqual(Result.fail(QUERY_PARAMS_MESSAGES.KeepsExisting));
    });

    test.each([
        'utm_*',
        'ref?',
    ])('toDnr_WhenRemovingAWildcardKey(%s)_ShouldWorkOnTheInspectedTabOnly', key => {
        // Arrange
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.Remove, name: 'fbclid' }),
                operation({ op: OPERATION_KINDS.Remove, name: key }),
            ],
        };

        // Act
        const result = ruleType.toDnr({
            action,
            condition: CONDITION,
            context: aRuleContext(),
        });

        // Assert
        expect(result).toEqual(Result.fail(QUERY_PARAMS_MESSAGES.WildcardKeys));
    });

    test('applyRequest_WhenTheOperationIsAnObjectPrototypeName_ShouldAddOrUpdate', () => {
        // Arrange
        const operations = [
            operation({ op: 'constructor', name: 'page', value: '3' }),
        ];

        // Act
        const url = urlAfter(TEST_URLS.Orders, operations);

        // Assert
        expect(url).toBe(urlAfter(TEST_URLS.Orders, [
            operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'page', value: '3' }),
        ]));
    });
});
