import { describe, expect, test } from 'vitest';
import { InMemoryRuleContext } from '../../Context/InMemoryRuleContext';
import { OPERATION_KINDS } from '../OperationKinds';
import { HEADER_OPERATION_MESSAGES } from './HeaderOperationMessages';
import { type HeaderOperation, HeaderOperations } from './HeaderOperations';
import type { HeaderEntry } from '../../../../Contracts/Timeline/HeaderEntry';
import { aRuleContext } from '../../../../TestData';

const HEADERS: HeaderEntry[] = [
    {
        name: 'Accept',
        value: 'application/json',
    },
    {
        name: 'X-Tenant',
        value: 'blue',
    },
];

function anOperation(overrides: Partial<HeaderOperation> = {}): HeaderOperation {
    return {
        op: OPERATION_KINDS.AddOrUpdate,
        name: 'X-Tenant',
        value: 'red',
        ...overrides,
    };
}

function aContextWithToken(): InMemoryRuleContext {
    return new InMemoryRuleContext(new Map([
        [
            'token',
            'abc123',
        ],
    ]));
}

describe('HeaderOperations', () => {
    test('read_WhenOperationsAreStored_ShouldReadEachOne', () => {
        // Arrange
        const action = {
            operations: [
                {
                    op: OPERATION_KINDS.Remove,
                    name: 'Cookie',
                    value: '',
                },
                {
                    op: OPERATION_KINDS.Add,
                    name: 'X-Trace',
                    value: '1',
                },
            ],
        };

        // Act
        const operations = HeaderOperations.read(action);

        // Assert
        expect(operations).toEqual(action.operations);
    });

    test('read_WhenFieldsAreMissingOrWrongTyped_ShouldFallBack', () => {
        // Arrange
        const action = {
            operations: [
                {},
                {
                    op: 7,
                    name: null,
                    value: 42,
                },
                'junk',
                null,
            ],
        };

        // Act
        const operations = HeaderOperations.read(action);

        // Assert
        expect(operations).toEqual([
            anOperation({
                name: '',
                value: '',
            }),
            anOperation({
                name: '',
                value: '',
            }),
        ]);
    });

    test('read_WhenKeyIsGiven_ShouldReadThatKey', () => {
        // Arrange
        const action = {
            operations: [anOperation()],
            responseOperations: [
                anOperation({
                    name: 'X-Response',
                }),
            ],
        };

        // Act
        const operations = HeaderOperations.read(action, 'responseOperations');

        // Assert
        expect(operations.map(operation => operation.name)).toEqual(['X-Response']);
    });

    test.each([
        {},
        {
            operations: 'X-Tenant',
        },
        {
            operations: {
                name: 'X-Tenant',
            },
        },
    ])('read_WhenOperationsAre(%j)_ShouldReturnNone', action => {
        // Act
        const operations = HeaderOperations.read(action);

        // Assert
        expect(operations).toEqual([]);
    });

    test('check_WhenThereAreNoOperations_ShouldAskForOne', () => {
        // Act
        const errors = HeaderOperations.check([]);

        // Assert
        expect(errors).toEqual(['Add at least one header.']);
    });

    test('check_WhenNamesAreValid_ShouldReturnNoErrors', () => {
        // Arrange
        const operations = [
            anOperation(),
            anOperation({
                op: OPERATION_KINDS.Remove,
                name: 'Cookie',
            }),
        ];

        // Act
        const errors = HeaderOperations.check(operations);

        // Assert
        expect(errors).toEqual([]);
    });

    test('check_WhenSeveralNamesAreInvalid_ShouldReportEachOne', () => {
        // Arrange
        const operations = [
            anOperation({
                name: '',
            }),
            anOperation(),
            anOperation({
                name: 'Bad Name',
            }),
        ];

        // Act
        const errors = HeaderOperations.check(operations);

        // Assert
        expect(errors).toEqual([
            "Header name is empty or has characters a header can't carry.",
            "Header name is empty or has characters a header can't carry.",
        ]);
    });

    test('describe_WhenThereAreOperations_ShouldListOpAndName', () => {
        // Arrange
        const operations = [
            anOperation(),
            anOperation({
                op: OPERATION_KINDS.Remove,
                name: 'Cookie',
            }),
        ];

        // Act
        const text = HeaderOperations.describe(operations);

        // Assert
        expect(text).toBe('addOrUpdate X-Tenant, remove Cookie');
    });

    test('describe_WhenThereAreNoOperations_ShouldBeEmpty', () => {
        // Act
        const text = HeaderOperations.describe([]);

        // Assert
        expect(text).toBe('');
    });

    test('apply_WhenAdding_ShouldAppendEvenIfTheHeaderExists', () => {
        // Arrange
        const operations = [
            anOperation({
                op: OPERATION_KINDS.Add,
                name: 'x-tenant',
            }),
        ];

        // Act
        const headers = HeaderOperations.apply({
            headers: HEADERS,
            operations,
            context: aRuleContext(),
        });

        // Assert
        expect(headers).toEqual([
            ...HEADERS,
            {
                name: 'x-tenant',
                value: 'red',
            },
        ]);
    });

    test('apply_WhenAddingIfMissingAndTheHeaderExists_ShouldKeepTheHeaders', () => {
        // Arrange
        const operations = [
            anOperation({
                op: OPERATION_KINDS.AddIfMissing,
                name: 'X-TENANT',
            }),
        ];

        // Act
        const headers = HeaderOperations.apply({
            headers: HEADERS,
            operations,
            context: aRuleContext(),
        });

        // Assert
        expect(headers).toEqual(HEADERS);
    });

    test('apply_WhenAddingIfMissingAndTheHeaderIsAbsent_ShouldAppendIt', () => {
        // Arrange
        const operations = [
            anOperation({
                op: OPERATION_KINDS.AddIfMissing,
                name: 'X-Trace',
                value: '1',
            }),
        ];

        // Act
        const headers = HeaderOperations.apply({
            headers: HEADERS,
            operations,
            context: aRuleContext(),
        });

        // Assert
        expect(headers).toEqual([
            ...HEADERS,
            {
                name: 'X-Trace',
                value: '1',
            },
        ]);
    });

    test('apply_WhenAddingOrUpdating_ShouldReplaceEveryCopyOfTheHeader', () => {
        // Arrange
        const headers = [
            ...HEADERS,
            {
                name: 'x-tenant',
                value: 'green',
            },
        ];

        // Act
        const applied = HeaderOperations.apply({
            headers,
            operations: [anOperation()],
            context: aRuleContext(),
        });

        // Assert
        expect(applied).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
            {
                name: 'X-Tenant',
                value: 'red',
            },
        ]);
    });

    test('apply_WhenRemoving_ShouldDropTheHeaderInAnyCase', () => {
        // Arrange
        const operations = [
            anOperation({
                op: OPERATION_KINDS.Remove,
                name: 'ACCEPT',
                value: 'ignored',
            }),
        ];

        // Act
        const headers = HeaderOperations.apply({
            headers: HEADERS,
            operations,
            context: aRuleContext(),
        });

        // Assert
        expect(headers).toEqual([
            {
                name: 'X-Tenant',
                value: 'blue',
            },
        ]);
    });

    test('apply_WhenRemovingAHeaderThatIsAbsent_ShouldKeepTheHeaders', () => {
        // Arrange
        const operations = [
            anOperation({
                op: OPERATION_KINDS.Remove,
                name: 'Cookie',
            }),
        ];

        // Act
        const headers = HeaderOperations.apply({
            headers: HEADERS,
            operations,
            context: aRuleContext(),
        });

        // Assert
        expect(headers).toEqual(HEADERS);
    });

    test.each([
        'bogus',
        '',
        'toString',
        'constructor',
        'hasOwnProperty',
        '__proto__',
    ])('apply_WhenOpIs(%s)_ShouldFallBackToAddOrUpdate', op => {
        // Arrange
        const operations = [
            anOperation({
                op,
            }),
        ];

        // Act
        const headers = HeaderOperations.apply({
            headers: HEADERS,
            operations,
            context: aRuleContext(),
        });

        // Assert
        expect(headers).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
            {
                name: 'X-Tenant',
                value: 'red',
            },
        ]);
    });

    test('apply_WhenValueHasVariables_ShouldRenderThem', () => {
        // Arrange
        const operations = [
            anOperation({
                name: 'Authorization',
                value: 'Bearer {{token}} {{missing}}',
            }),
        ];

        // Act
        const headers = HeaderOperations.apply({
            headers: [],
            operations,
            context: aContextWithToken(),
        });

        // Assert
        expect(headers).toEqual([
            {
                name: 'Authorization',
                value: 'Bearer abc123 {{missing}}',
            },
        ]);
    });

    test('apply_WhenSeveralOperationsRun_ShouldApplyThemInOrder', () => {
        // Arrange
        const operations = [
            anOperation({
                op: OPERATION_KINDS.Remove,
                name: 'X-Tenant',
            }),
            anOperation({
                op: OPERATION_KINDS.AddIfMissing,
                name: 'X-Tenant',
                value: 'gold',
            }),
            anOperation({
                op: OPERATION_KINDS.AddIfMissing,
                name: 'X-Tenant',
                value: 'never',
            }),
        ];

        // Act
        const headers = HeaderOperations.apply({
            headers: HEADERS,
            operations,
            context: aRuleContext(),
        });

        // Assert
        expect(headers).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
            {
                name: 'X-Tenant',
                value: 'gold',
            },
        ]);
    });

    test('apply_WhenThereAreNoOperations_ShouldReturnTheSameHeaders', () => {
        // Act
        const headers = HeaderOperations.apply({
            headers: HEADERS,
            operations: [],
            context: aRuleContext(),
        });

        // Assert
        expect(headers).toBe(HEADERS);
    });

    test('toBrowser_WhenOperationsAreSupported_ShouldMapThemToBrowserOperations', () => {
        // Arrange
        const operations = [
            anOperation({
                op: OPERATION_KINDS.AddOrUpdate,
                name: 'Authorization',
                value: 'Bearer {{token}}',
            }),
            anOperation({
                op: OPERATION_KINDS.Add,
                name: 'Accept-Language',
                value: 'el',
            }),
            anOperation({
                op: OPERATION_KINDS.Remove,
                name: 'Cookie',
                value: 'ignored',
            }),
        ];

        // Act
        const rules = HeaderOperations.toBrowser({
            operations,
            context: aContextWithToken(),
            isRequest: true,
        });

        // Assert
        expect(rules).toEqual({
            hasErrors: false,
            value: [
                {
                    header: 'Authorization',
                    operation: 'set',
                    value: 'Bearer abc123',
                },
                {
                    header: 'Accept-Language',
                    operation: 'append',
                    value: 'el',
                },
                {
                    header: 'Cookie',
                    operation: 'remove',
                },
            ],
        });
    });

    test.each([
        true,
        false,
    ])('toBrowser_WhenAnOperationAddsIfMissingAndIsRequestIs(%s)_ShouldFail', isRequest => {
        // Arrange
        const operations = [
            anOperation(),
            anOperation({
                op: OPERATION_KINDS.AddIfMissing,
            }),
        ];

        // Act
        const rules = HeaderOperations.toBrowser({
            operations,
            context: aRuleContext(),
            isRequest,
        });

        // Assert
        expect(rules).toEqual({
            hasErrors: true,
            error: HEADER_OPERATION_MESSAGES.AddIfMissing,
        });
    });

    test.each([
        'X-Custom',
        'Authorization',
        'Content-Type',
    ])('toBrowser_WhenARequestAddsTheNonStandardHeader(%s)_ShouldFail', name => {
        // Arrange
        const operations = [
            anOperation({
                op: OPERATION_KINDS.Add,
                name,
            }),
        ];

        // Act
        const rules = HeaderOperations.toBrowser({
            operations,
            context: aRuleContext(),
            isRequest: true,
        });

        // Assert
        expect(rules).toEqual({
            hasErrors: true,
            error: HEADER_OPERATION_MESSAGES.AddToRequest,
        });
    });

    test.each([
        'accept',
        ' User-Agent ',
        'X-Forwarded-For',
        'cookie',
    ])('toBrowser_WhenARequestAddsTheStandardHeader(%s)_ShouldAppendIt', name => {
        // Arrange
        const operations = [
            anOperation({
                op: OPERATION_KINDS.Add,
                name,
            }),
        ];

        // Act
        const rules = HeaderOperations.toBrowser({
            operations,
            context: aRuleContext(),
            isRequest: true,
        });

        // Assert
        expect(rules).toEqual({
            hasErrors: false,
            value: [
                {
                    header: name,
                    operation: 'append',
                    value: 'red',
                },
            ],
        });
    });

    test('toBrowser_WhenAResponseAddsAnyHeader_ShouldAppendIt', () => {
        // Arrange
        const operations = [
            anOperation({
                op: OPERATION_KINDS.Add,
                name: 'X-Custom',
            }),
        ];

        // Act
        const rules = HeaderOperations.toBrowser({
            operations,
            context: aRuleContext(),
            isRequest: false,
        });

        // Assert
        expect(rules).toEqual({
            hasErrors: false,
            value: [
                {
                    header: 'X-Custom',
                    operation: 'append',
                    value: 'red',
                },
            ],
        });
    });

    test.each([
        'bogus',
        'toString',
        'constructor',
    ])('toBrowser_WhenOpIs(%s)_ShouldFallBackToSet', op => {
        // Arrange
        const operations = [
            anOperation({
                op,
            }),
        ];

        // Act
        const rules = HeaderOperations.toBrowser({
            operations,
            context: aRuleContext(),
            isRequest: false,
        });

        // Assert
        expect(rules).toEqual({
            hasErrors: false,
            value: [
                {
                    header: 'X-Tenant',
                    operation: 'set',
                    value: 'red',
                },
            ],
        });
    });

    test('toBrowser_WhenThereAreNoOperations_ShouldReturnNoRules', () => {
        // Act
        const rules = HeaderOperations.toBrowser({
            operations: [],
            context: aRuleContext(),
            isRequest: true,
        });

        // Assert
        expect(rules).toEqual({
            hasErrors: false,
            value: [],
        });
    });

    test('withoutSecrets_WhenSomeHeadersAreSensitive_ShouldBlankOnlyThoseValues', () => {
        // Arrange
        const action = {
            label: 'kept',
            operations: [
                anOperation({
                    name: 'Authorization',
                    value: 'Bearer secret',
                }),
                anOperation({
                    name: ' x-api-key ',
                    value: 'key',
                }),
                anOperation(),
            ],
        };

        // Act
        const cleaned = HeaderOperations.withoutSecrets(action);

        // Assert
        expect(cleaned).toEqual({
            label: 'kept',
            operations: [
                anOperation({
                    name: 'Authorization',
                    value: '',
                }),
                anOperation({
                    name: ' x-api-key ',
                    value: '',
                }),
                anOperation(),
            ],
        });
    });

    test('withoutSecrets_WhenKeyIsGiven_ShouldCleanOnlyThatKey', () => {
        // Arrange
        const secret = anOperation({
            name: 'Cookie',
            value: 'session=1',
        });
        const action = {
            operations: [secret],
            responseOperations: [secret],
        };

        // Act
        const cleaned = HeaderOperations.withoutSecrets(action, 'responseOperations');

        // Assert
        expect(cleaned).toEqual({
            operations: [secret],
            responseOperations: [
                {
                    ...secret,
                    value: '',
                },
            ],
        });
    });

    test('withoutSecrets_WhenOperationsAreMalformed_ShouldNormalizeThem', () => {
        // Arrange
        const action = {
            operations: [
                'junk',
                {
                    name: 'Set-Cookie',
                    value: 'a=1',
                },
            ],
        };

        // Act
        const cleaned = HeaderOperations.withoutSecrets(action);

        // Assert
        expect(cleaned).toEqual({
            operations: [
                anOperation({
                    name: 'Set-Cookie',
                    value: '',
                }),
            ],
        });
    });
});
