import { describe, expect, test } from 'vitest';
import { OPERATION_KINDS } from '../../Rules/Types/OperationKinds';
import { SchemaVersion2Migration } from './SchemaVersion2Migration';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';

type RawRecord = Record<string, unknown>;

const ACTIVE_PROFILE_ID = 'default';

function aStoredRule(overrides: RawRecord = {}): RawRecord {
    return {
        id: 'rule-1',
        profileId: ACTIVE_PROFILE_ID,
        name: 'Rule',
        enabled: true,
        type: RULE_TYPE_IDS.RequestHeader,
        criteria: {
            match: 'all',
            items: [],
        },
        action: {
            operations: [],
        },
        ...overrides,
    };
}

function aStoredCriterion(overrides: RawRecord = {}): RawRecord {
    return {
        field: 'url',
        op: 'wildcard',
        name: '',
        value: '*/api/*',
        negate: false,
        ...overrides,
    };
}

function migrate(...rules: RawRecord[]): RawRecord[] {
    return SchemaVersion2Migration.rulesOf({
        schemaVersion: 2,
        activeProfileId: ACTIVE_PROFILE_ID,
        rules,
    });
}

function onlyRuleOf(rule: RawRecord): RawRecord {
    const migrated = migrate(rule);
    expect(migrated).toHaveLength(1);

    return migrated[0]!;
}

function itemsOf(rule: RawRecord): RawRecord[] {
    return (rule['criteria'] as RawRecord)['items'] as RawRecord[];
}

describe('SchemaVersion2Migration', () => {
    test('rulesOf_WhenARuleHasAProfile_ShouldDropTheProfileId', () => {
        // Arrange
        const rule = aStoredRule();

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated).not.toHaveProperty('profileId');
        expect(migrated['enabled']).toBe(true);
    });

    test('rulesOf_WhenARuleBelongsToAnotherProfile_ShouldKeepItDisabled', () => {
        // Arrange
        const rule = aStoredRule({
            profileId: 'staging',
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated['enabled']).toBe(false);
    });

    test('rulesOf_WhenThereIsNoActiveProfile_ShouldKeepEveryRuleAsItWas', () => {
        // Arrange
        const settings = {
            schemaVersion: 2,
            rules: [
                aStoredRule({
                    profileId: 'staging',
                }),
            ],
        };

        // Act
        const migrated = SchemaVersion2Migration.rulesOf(settings);

        // Assert
        expect(migrated[0]?.['enabled']).toBe(true);
    });

    test('rulesOf_WhenTheTypeWasRegexRedirect_ShouldBecomeARedirectWithAUrlRegexCondition', () => {
        // Arrange
        const rule = aStoredRule({
            type: 'regexRedirect',
            action: {
                regex: '^https://api\\.example\\.com/users/(\\d+)$',
                template: 'http://localhost:5000/users/$1',
                strictParameters: true,
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated['type']).toBe(RULE_TYPE_IDS.Redirect);
        expect(migrated['action']).toEqual({
            target: 'http://localhost:5000/users/$1',
            status: 0,
        });
        expect(itemsOf(migrated)).toEqual([
            {
                field: 'url',
                op: 'regex',
                name: '',
                value: '^https://api\\.example\\.com/users/(\\d+)$',
                negate: false,
            },
        ]);
    });

    test('rulesOf_WhenTheTypeWasRedirectWithStatus_ShouldBecomeARedirectWithThatStatus', () => {
        // Arrange
        const rule = aStoredRule({
            type: 'redirectWithStatus',
            action: {
                targetUrl: 'https://example.com/moved',
                status: 301,
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated['type']).toBe(RULE_TYPE_IDS.Redirect);
        expect(migrated['action']).toEqual({
            target: 'https://example.com/moved',
            status: 301,
        });
    });

    test('rulesOf_WhenTheTypeWasAddQueryParams_ShouldAddOrUpdateEachParam', () => {
        // Arrange
        const rule = aStoredRule({
            type: 'addQueryParams',
            action: {
                params: [
                    {
                        key: 'debug',
                        value: 'true',
                    },
                ],
                replaceOnly: false,
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated['type']).toBe(RULE_TYPE_IDS.QueryParams);
        expect(migrated['action']).toEqual({
            operations: [
                {
                    op: OPERATION_KINDS.AddOrUpdate,
                    name: 'debug',
                    value: 'true',
                },
            ],
        });
    });

    test('rulesOf_WhenTheTypeWasRemoveQueryParams_ShouldRemoveEachKey', () => {
        // Arrange
        const rule = aStoredRule({
            type: 'removeQueryParams',
            action: {
                keys: [
                    'utm_*',
                    'fbclid',
                ],
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated['type']).toBe(RULE_TYPE_IDS.QueryParams);
        expect(migrated['action']).toEqual({
            operations: [
                {
                    op: OPERATION_KINDS.Remove,
                    name: 'utm_*',
                    value: '',
                },
                {
                    op: OPERATION_KINDS.Remove,
                    name: 'fbclid',
                    value: '',
                },
            ],
        });
    });

    test('rulesOf_WhenTheTypeWasStatusOverride_ShouldBecomeAMockOfTheStatusOnly', () => {
        // Arrange
        const rule = aStoredRule({
            type: 'statusOverride',
            action: {
                status: 503,
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated['type']).toBe(RULE_TYPE_IDS.MockResponse);
        expect(migrated['action']).toEqual({
            overrideStatus: true,
            status: 503,
            overrideBody: false,
            contentType: '',
            headers: [],
            body: '',
        });
    });

    test('rulesOf_WhenTheTypeWasMockResponse_ShouldOverrideStatusAndBody', () => {
        // Arrange
        const rule = aStoredRule({
            type: RULE_TYPE_IDS.MockResponse,
            action: {
                status: 200,
                body: '{}',
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated['action']).toEqual({
            status: 200,
            body: '{}',
            overrideStatus: true,
            overrideBody: true,
        });
    });

    test.each([
        [
            'Bearer',
            'abc',
            'Bearer abc',
        ],
        [
            '',
            'raw-token',
            'raw-token',
        ],
    ])('rulesOf_WhenTheTypeWasAuthTokenWithScheme(%s)_ShouldAddOrUpdateTheHeaderTo(%s)', (
        scheme,
        token,
        expected,
    ) => {
        // Arrange
        const rule = aStoredRule({
            type: 'authToken',
            action: {
                headerName: 'Authorization',
                scheme,
                token,
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated['type']).toBe(RULE_TYPE_IDS.RequestHeader);
        expect(migrated['action']).toEqual({
            operations: [
                {
                    op: OPERATION_KINDS.AddOrUpdate,
                    name: 'Authorization',
                    value: expected,
                },
            ],
        });
    });

    test.each([
        [
            'set',
            OPERATION_KINDS.AddOrUpdate,
        ],
        [
            'append',
            OPERATION_KINDS.Add,
        ],
        [
            'remove',
            OPERATION_KINDS.Remove,
        ],
    ])('rulesOf_WhenAHeaderOperationWas(%s)_ShouldBecome(%s)', (oldOperation, expected) => {
        // Arrange
        const rule = aStoredRule({
            type: RULE_TYPE_IDS.ResponseHeader,
            action: {
                operations: [
                    {
                        op: oldOperation,
                        name: 'Cache-Control',
                        value: 'no-store',
                    },
                ],
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated['action']).toEqual({
            operations: [
                {
                    op: expected,
                    name: 'Cache-Control',
                    value: 'no-store',
                },
            ],
        });
    });

    test.each([
        [
            RULE_TYPE_IDS.RequestCookie,
            'set',
            OPERATION_KINDS.AddOrUpdate,
        ],
        [
            RULE_TYPE_IDS.RequestCookie,
            'remove',
            OPERATION_KINDS.Remove,
        ],
        [
            RULE_TYPE_IDS.ResponseCookie,
            'add',
            OPERATION_KINDS.Add,
        ],
        [
            RULE_TYPE_IDS.ResponseCookie,
            'modify',
            OPERATION_KINDS.AddOrUpdate,
        ],
    ])('rulesOf_WhenA(%s)OperationWas(%s)_ShouldBecome(%s)', (
        type,
        oldOperation,
        expected,
    ) => {
        // Arrange
        const rule = aStoredRule({
            type,
            action: {
                op: oldOperation,
                name: 'session',
                value: 'abc',
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated['action']).toEqual({
            op: expected,
            name: 'session',
            value: 'abc',
        });
    });

    test.each([
        [
            'equals',
            'https://api.example.com/a*b?',
            'wildcard',
            'https://api.example.com/a\\*b\\?',
        ],
        [
            'contains',
            '/users',
            'wildcard',
            '*/users*',
        ],
        [
            'baseUrl',
            'https://api.example.com/',
            'regex',
            '^https://api\\.example\\.com(?:[/?#].*)?$',
        ],
        [
            'wildcard',
            '*/api/*',
            'wildcard',
            '*/api/*',
        ],
    ])('rulesOf_WhenAnOperatorWas(%s)_ShouldBecomeAnEquivalent', (
        op,
        value,
        expectedOperator,
        expectedValue,
    ) => {
        // Arrange
        const rule = aStoredRule({
            criteria: {
                match: 'all',
                items: [
                    aStoredCriterion({
                        op,
                        value,
                    }),
                ],
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(itemsOf(migrated)).toEqual([
            aStoredCriterion({
                op: expectedOperator,
                value: expectedValue,
            }),
        ]);
    });

    test.each([
        'device',
        'clientIp',
        'country',
    ])('rulesOf_WhenASimulatedCondition(%s)IsUsed_ShouldDropItAndDisableTheRule', field => {
        // Arrange
        const rule = aStoredRule({
            criteria: {
                match: 'all',
                items: [
                    aStoredCriterion(),
                    aStoredCriterion({
                        field,
                        op: 'oneOf',
                        value: 'GR',
                    }),
                ],
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(itemsOf(migrated)).toEqual([aStoredCriterion()]);
        expect(migrated['enabled']).toBe(false);
    });

    test.each([
        'blockRequest',
        'networkFailure',
        'failoverResponse',
        'phasedRelease',
        'abSegment',
        'loadBalancer',
        'headerFindReplace',
        'requestId',
        'bulkRedirects',
    ])('rulesOf_WhenTheTypeWas(%s)_ShouldDropTheRule', type => {
        // Arrange
        const rule = aStoredRule({
            type,
        });

        // Act
        const migrated = migrate(rule);

        // Assert
        expect(migrated).toEqual([]);
    });

    test('rulesOf_WhenARuleHadLatency_ShouldPlaceALatencyRuleBeforeIt', () => {
        // Arrange
        const criteria = {
            match: 'all',
            items: [aStoredCriterion()],
        };
        const rule = aStoredRule({
            id: 'mock-1',
            name: 'Users mock',
            type: RULE_TYPE_IDS.MockResponse,
            criteria,
            action: {
                status: 200,
                body: '{}',
                delayMs: 1500,
            },
        });

        // Act
        const migrated = migrate(rule);

        // Assert
        expect(migrated).toEqual([
            {
                id: 'mock-1-latency',
                name: 'Users mock latency',
                enabled: true,
                type: RULE_TYPE_IDS.Delay,
                criteria,
                action: {
                    delayMs: 1500,
                },
            },
            {
                id: 'mock-1',
                name: 'Users mock',
                enabled: true,
                type: RULE_TYPE_IDS.MockResponse,
                criteria,
                action: {
                    status: 200,
                    body: '{}',
                    overrideStatus: true,
                    overrideBody: true,
                },
            },
        ]);
    });

    test('rulesOf_WhenAMergedTypeHadLatency_ShouldKeepTheLatencyBeforeTheNewType', () => {
        // Arrange
        const rule = aStoredRule({
            id: 'status-1',
            name: 'Server error',
            type: 'statusOverride',
            action: {
                status: 503,
                delayMs: 2000,
            },
        });

        // Act
        const migrated = migrate(rule);

        // Assert
        expect(migrated.map(item => [
            item['id'],
            item['type'],
            item['action'],
        ])).toEqual([
            [
                'status-1-latency',
                RULE_TYPE_IDS.Delay,
                {
                    delayMs: 2000,
                },
            ],
            [
                'status-1',
                RULE_TYPE_IDS.MockResponse,
                {
                    overrideStatus: true,
                    status: 503,
                    overrideBody: false,
                    contentType: '',
                    headers: [],
                    body: '',
                },
            ],
        ]);
    });

    test('rulesOf_WhenADroppedTypeHadLatency_ShouldDropBoth', () => {
        // Arrange
        const rule = aStoredRule({
            type: 'blockRequest',
            action: {
                delayMs: 2000,
            },
        });

        // Act
        const migrated = migrate(rule);

        // Assert
        expect(migrated).toEqual([]);
    });

    test('rulesOf_WhenALatencyIsZero_ShouldOnlyDropTheKey', () => {
        // Arrange
        const rule = aStoredRule({
            action: {
                operations: [],
                delayMs: 0,
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated['action']).toEqual({
            operations: [],
        });
    });

    test('rulesOf_WhenTheRuleIsALatencyRule_ShouldKeepItsDelay', () => {
        // Arrange
        const rule = aStoredRule({
            type: RULE_TYPE_IDS.Delay,
            action: {
                delayMs: 2000,
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated['action']).toEqual({
            delayMs: 2000,
        });
    });

    test.each([
        'toString',
        'constructor',
        'valueOf',
        'hasOwnProperty',
        '__proto__',
    ])('rulesOf_WhenTheTypeIsTheObjectMember(%s)_ShouldDropTheRule', type => {
        // Arrange
        const rule = aStoredRule({
            type,
        });

        // Act
        const migrated = migrate(rule);

        // Assert
        expect(migrated).toEqual([]);
    });

    test.each([
        'toString',
        'constructor',
        'valueOf',
    ])('rulesOf_WhenACriterionOperatorIsTheObjectMember(%s)_ShouldKeepTheCriterion', op => {
        // Arrange
        const criterion = aStoredCriterion({
            op,
        });
        const rule = aStoredRule({
            criteria: {
                match: 'all',
                items: [criterion],
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(itemsOf(migrated)).toEqual([criterion]);
    });

    test.each([
        'toString',
        'constructor',
        'valueOf',
    ])('rulesOf_WhenAHeaderOperationIsTheObjectMember(%s)_ShouldBecomeAddOrUpdate', op => {
        // Arrange
        const rule = aStoredRule({
            action: {
                operations: [
                    {
                        op,
                        name: 'X-Tenant',
                        value: 'blue',
                    },
                ],
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated['action']).toEqual({
            operations: [
                {
                    op: OPERATION_KINDS.AddOrUpdate,
                    name: 'X-Tenant',
                    value: 'blue',
                },
            ],
        });
    });

    test.each([
        [
            RULE_TYPE_IDS.RequestCookie,
            OPERATION_KINDS.AddOrUpdate,
        ],
        [
            RULE_TYPE_IDS.ResponseCookie,
            OPERATION_KINDS.Add,
        ],
    ])('rulesOf_WhenA(%s)OperationIsAnObjectMember_ShouldFallBackTo(%s)', (type, expected) => {
        // Arrange
        const rule = aStoredRule({
            type,
            action: {
                op: 'toString',
                name: 'session',
                value: '1',
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated['action']).toEqual({
            op: expected,
            name: 'session',
            value: '1',
        });
    });
});
