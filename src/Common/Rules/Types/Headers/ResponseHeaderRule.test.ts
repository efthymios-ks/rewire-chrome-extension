import { describe, expect, test } from 'vitest';
import { Result } from '../../../Results/Result';
import type { DnrCondition } from '../../Criteria/DnrCondition';
import { HEADER_OPERATION_MESSAGES } from './HeaderOperationMessages';
import { ResponseHeaderRule } from './ResponseHeaderRule';
import { OPERATION_KINDS } from '../OperationKinds';
import type { HeaderEntry } from '../../../../Contracts/Timeline/HeaderEntry';
import { aRequestDraft, aResponseDraft, aRuleContext } from '../../../../TestData';

const ruleType = new ResponseHeaderRule();
const CONDITION: DnrCondition = {
    urlFilter: '||api.example.com',
};
const VARY_HEADERS: HeaderEntry[] = [
    {
        name: 'Vary',
        value: 'Accept',
    },
];

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

function headersAfter(headers: HeaderEntry[], operations: Record<string, string>[]): HeaderEntry[] {
    return ruleType.applyResponse({
        draft: aResponseDraft({
            headers,
        }),
        action: {
            operations,
        },
        context: aRuleContext(),
        request: aRequestDraft(),
    }).headers;
}

describe('ResponseHeaderRule', () => {
    test('applyResponse_WhenAdd_ShouldKeepTheServerValue', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.Add, name: 'Vary', value: 'Origin' }),
        ];

        // Act
        const headers = headersAfter(VARY_HEADERS, operations);

        // Assert
        expect(headers).toEqual([
            {
                name: 'Vary',
                value: 'Accept',
            },
            {
                name: 'Vary',
                value: 'Origin',
            },
        ]);
    });

    test('applyResponse_WhenAddIfMissingAndTheHeaderIsThere_ShouldKeepTheServerValue', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.AddIfMissing, name: 'vary', value: 'Origin' }),
        ];

        // Act
        const headers = headersAfter(VARY_HEADERS, operations);

        // Assert
        expect(headers).toEqual(VARY_HEADERS);
    });

    test('applyResponse_WhenAddIfMissingAndTheHeaderIsMissing_ShouldAddIt', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.AddIfMissing, name: 'Cache-Control', value: 'no-store' }),
        ];

        // Act
        const headers = headersAfter(VARY_HEADERS, operations);

        // Assert
        expect(headers).toEqual([
            ...VARY_HEADERS,
            {
                name: 'Cache-Control',
                value: 'no-store',
            },
        ]);
    });

    test('applyResponse_WhenAddOrUpdate_ShouldReplaceTheHeader', () => {
        // Arrange
        const operations = [
            operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'content-type', value: 'text/plain' }),
        ];

        // Act
        const headers = headersAfter(aResponseDraft().headers, operations);

        // Assert
        expect(headers).toEqual([
            {
                name: 'content-type',
                value: 'text/plain',
            },
        ]);
    });

    test('applyResponse_WhenRemove_ShouldDropTheHeader', () => {
        // Arrange
        const operations = [operation({ op: OPERATION_KINDS.Remove, name: 'Content-Type' })];

        // Act
        const headers = headersAfter(aResponseDraft().headers, operations);

        // Assert
        expect(headers).toEqual([]);
    });

    test('applyResponse_WhenValueIsATemplate_ShouldRenderTheVariable', () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable('build', '1.2.3');
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'X-Build', value: '{{build}}' }),
            ],
        };

        // Act
        const draft = ruleType.applyResponse({
            draft: aResponseDraft(),
            action,
            context,
            request: aRequestDraft(),
        });

        // Assert
        expect(draft.headers).toContainEqual({
            name: 'X-Build',
            value: '1.2.3',
        });
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

    test('withoutSecrets_WhenASetCookieHeaderIsSet_ShouldBlankOnlyItsValue', () => {
        // Arrange
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'Set-Cookie', value: 'session=abc' }),
                operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'Cache-Control', value: 'no-store' }),
            ],
        };

        // Act
        const stripped = ruleType.withoutSecrets(action);

        // Assert
        expect(stripped['operations']).toEqual([
            operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'Set-Cookie', value: '' }),
            operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'Cache-Control', value: 'no-store' }),
        ]);
    });

    test('toDnr_WhenAddingACustomHeader_ShouldAppendInTheBrowser', () => {
        // Arrange
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.Add, name: 'X-Custom', value: '1' }),
                operation({ op: OPERATION_KINDS.AddOrUpdate, name: 'Cache-Control', value: 'no-store' }),
                operation({ op: OPERATION_KINDS.Remove, name: 'Server' }),
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
                    responseHeaders: [
                        {
                            header: 'X-Custom',
                            operation: 'append',
                            value: '1',
                        },
                        {
                            header: 'Cache-Control',
                            operation: 'set',
                            value: 'no-store',
                        },
                        {
                            header: 'Server',
                            operation: 'remove',
                        },
                    ],
                },
                condition: CONDITION,
            },
        ]));
    });

    test('toDnr_WhenAddIfMissing_ShouldWorkOnTheInspectedTabOnly', () => {
        // Arrange
        const action = {
            operations: [
                operation({ op: OPERATION_KINDS.AddIfMissing, name: 'Cache-Control', value: 'no-store' }),
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
