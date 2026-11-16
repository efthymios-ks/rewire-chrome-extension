import { describe, expect, test } from 'vitest';
import { Result } from '../../../Results/Result';
import type { DnrCondition } from '../../Criteria/DnrCondition';
import { HEADER_OPERATION_MESSAGES } from './HeaderOperationMessages';
import { RequestHeaderRule } from './RequestHeaderRule';
import { OPERATION_KINDS } from '../OperationKinds';
import type { HeaderEntry } from '../../../../Contracts/Timeline/HeaderEntry';
import { aRequestDraft, aRuleContext } from '../../../../TestData';

const ruleType = new RequestHeaderRule();
const CONDITION: DnrCondition = {
    urlFilter: '||api.example.com',
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

function headersAfter(operations: Record<string, string>[]): HeaderEntry[] {
    return ruleType.applyRequest({
        draft: aRequestDraft(),
        action: {
            operations,
        },
        context: aRuleContext(),
    }).headers;
}

describe('RequestHeaderRule', () => {
    test('applyRequest_WhenAddAndTheHeaderIsThere_ShouldAddAnotherValue', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.Add, name: 'Accept', value: 'text/plain' }),
        ];

        // Act
        const headers = headersAfter(operations);

        // Assert
        expect(headers).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
            {
                name: 'Accept',
                value: 'text/plain',
            },
        ]);
    });

    test('applyRequest_WhenAddIfMissingAndTheHeaderIsThere_ShouldKeepItsValue', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.AddIfMissing, name: 'accept', value: 'text/plain' }),
        ];

        // Act
        const headers = headersAfter(operations);

        // Assert
        expect(headers).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
        ]);
    });

    test('applyRequest_WhenAddIfMissingAndTheHeaderIsMissing_ShouldAddIt', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.AddIfMissing, name: 'X-Debug', value: '1' }),
        ];

        // Act
        const headers = headersAfter(operations);

        // Assert
        expect(headers).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
            {
                name: 'X-Debug',
                value: '1',
            },
        ]);
    });

    test('applyRequest_WhenAddOrUpdate_ShouldReplaceTheHeaderWhateverItsCase', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'accept', value: 'text/plain' }),
        ];

        // Act
        const headers = headersAfter(operations);

        // Assert
        expect(headers).toEqual([
            {
                name: 'accept',
                value: 'text/plain',
            },
        ]);
    });

    test('applyRequest_WhenAddOrUpdateAndTheHeaderIsMissing_ShouldAddIt', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'X-Debug', value: '1' }),
        ];

        // Act
        const headers = headersAfter(operations);

        // Assert
        expect(headers).toContainEqual({
            name: 'X-Debug',
            value: '1',
        });
    });

    test('applyRequest_WhenRemove_ShouldDropTheHeader', () => {
        // Arrange
        const operations = [operation({ op: OPERATION_KINDS.Remove, name: 'ACCEPT' })];

        // Act
        const headers = headersAfter(operations);

        // Assert
        expect(headers).toEqual([]);
    });

    test('applyRequest_WhenTheOperationIsUnknown_ShouldAddOrUpdate', () => {
        // Arrange
        const operations = [
            operation({ op: 'set', name: 'Accept', value: 'text/plain' }),
        ];

        // Act
        const headers = headersAfter(operations);

        // Assert
        expect(headers).toEqual([
            {
                name: 'Accept',
                value: 'text/plain',
            },
        ]);
    });

    test('applyRequest_WhenValueIsATemplate_ShouldRenderKnownVariablesOnly', () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable('tenant', 'blue');
        const action = {
            operations: [
                operation({
                    op: OPERATION_KINDS.AddOrUpdate,
                    name: 'X-Tenant',
                    value: '{{tenant}}/{{region}}',
                }),
            ],
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context,
        });

        // Assert
        expect(draft.headers).toContainEqual({
            name: 'X-Tenant',
            value: 'blue/{{region}}',
        });
    });

    test('defaultAction_WhenCreated_ShouldStartWithOneBlankAddOrUpdateRow', () => {
        // Arrange
        const expected = [
            operation({ op: OPERATION_KINDS.AddOrUpdate, name: '', value: '' }),
        ];

        // Act
        const action = ruleType.defaultAction();

        // Assert
        expect(action['operations']).toEqual(expected);
    });

    test('validate_WhenThereAreNoOperations_ShouldAskForAHeader', () => {
        // Arrange
        const action = {
            operations: [],
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(['Add at least one header.']);
    });

    test('validate_WhenAHeaderNameHasSpaces_ShouldRejectIt', () => {
        // Arrange
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'X Debug', value: '1' }),
            ],
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(["Header name is empty or has characters a header can't carry."]);
    });

    test('withoutSecrets_WhenAnAuthorizationHeaderIsSet_ShouldBlankOnlyItsValue', () => {
        // Arrange
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'Authorization', value: 'Bearer abc' }),
                operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'X-Debug', value: '1' }),
            ],
        };

        // Act
        const stripped = ruleType.withoutSecrets(action);

        // Assert
        expect(stripped['operations']).toEqual([
            operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'Authorization', value: '' }),
            operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'X-Debug', value: '1' }),
        ]);
    });

    test('toDnr_WhenAddOrUpdateAndRemove_ShouldSetAndRemoveRequestHeaders', () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable('build', 'b7');
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'X-Build', value: '{{build}}' }),
                operation({ op: OPERATION_KINDS.Remove, name: 'Cookie' }),
            ],
        };

        // Act
        const result = ruleType.toDnr({ action, condition: CONDITION, context });

        // Assert
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: 'modifyHeaders',
                    requestHeaders: [
                        {
                            header: 'X-Build',
                            operation: 'set',
                            value: 'b7',
                        },
                        {
                            header: 'Cookie',
                            operation: 'remove',
                        },
                    ],
                },
                condition: CONDITION,
            },
        ]));
    });

    test('toDnr_WhenAddingAStandardHeader_ShouldAppendInTheBrowser', () => {
        // Arrange
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.Add, name: 'Accept', value: 'text/plain' }),
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
                    type: 'modifyHeaders',
                    requestHeaders: [
                        {
                            header: 'Accept',
                            operation: 'append',
                            value: 'text/plain',
                        },
                    ],
                },
                condition: CONDITION,
            },
        ]));
    });

    test('toDnr_WhenAddingACustomHeader_ShouldWorkOnTheInspectedTabOnly', () => {
        // Arrange
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.Add, name: 'X-Trace', value: '1' }),
            ],
        };

        // Act
        const result = ruleType.toDnr({
            action,
            condition: CONDITION,
            context: aRuleContext(),
        });

        // Assert
        expect(result).toEqual(Result.fail(HEADER_OPERATION_MESSAGES.AddToRequest));
    });

    test('toDnr_WhenAddIfMissing_ShouldWorkOnTheInspectedTabOnly', () => {
        // Arrange
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.AddIfMissing, name: 'Accept', value: 'text/plain' }),
            ],
        };

        // Act
        const result = ruleType.toDnr({
            action,
            condition: CONDITION,
            context: aRuleContext(),
        });

        // Assert
        expect(result).toEqual(Result.fail(HEADER_OPERATION_MESSAGES.AddIfMissing));
    });
});
