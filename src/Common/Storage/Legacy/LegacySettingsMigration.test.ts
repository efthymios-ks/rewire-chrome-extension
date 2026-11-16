import { afterEach, describe, expect, test, vi } from 'vitest';
import type { LegacyInterceptionRule } from './LegacyInterceptionRule';
import type { LegacyRedirectRule } from './LegacyRedirectRule';
import { LegacySettingsMigration } from './LegacySettingsMigration';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';

const GENERATED_ID = '00000000-0000-4000-8000-000000000000';
const REDIRECT_SOURCE = '^https://api\\.example\\.com/(.*)$';

function anInterception(overrides: Partial<LegacyInterceptionRule> = {}): LegacyInterceptionRule {
    return {
        id: 'interception-1',
        enabled: true,
        method: 'GET',
        urlPattern: '*/api/v1/users/*',
        responseSource: 1,
        statusCodeOverride: 201,
        mockContentType: 'application/json',
        mockBody: '{"id":42}',
        delayInMilliseconds: 300,
        ...overrides,
    };
}

function aRedirect(fields: object): LegacyRedirectRule {
    return {
        id: 'redirect-1',
        enabled: true,
        name: 'Local',
        kind: 2,
        source: REDIRECT_SOURCE,
        target: 'http://localhost:5000/$1',
        strictParameters: false,
        ...fields,
    };
}

describe('LegacySettingsMigration', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('toRules_WhenAnInterceptionServesAMockWithDelay_ShouldBuildALatencyRuleThenAMockRule', () => {
        // Arrange
        const stored = {
            interceptionRules: [anInterception()],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules.map(rule => [
            rule.id,
            rule.type,
        ])).toEqual([
            [
                'interception-1-latency',
                RULE_TYPE_IDS.Delay,
            ],
            [
                'interception-1',
                RULE_TYPE_IDS.MockResponse,
            ],
        ]);
        expect(rules[0]?.action).toEqual({
            delayMs: 300,
        });
        expect(rules[1]?.action).toMatchObject({
            overrideStatus: true,
            status: 201,
            overrideBody: true,
            body: '{"id":42}',
        });
        expect(rules[1]?.criteria.items.map(item => item.field)).toEqual([
            CRITERION_FIELD_IDS.Method,
            CRITERION_FIELD_IDS.Url,
        ]);
    });

    test('toRules_WhenALiveInterceptionOverridesTheStatus_ShouldBuildAStatusOnlyMockRule', () => {
        // Arrange
        const stored = {
            interceptionRules: [
                anInterception({
                    responseSource: 2,
                    statusCodeOverride: 503,
                    delayInMilliseconds: 0,
                }),
            ],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules).toHaveLength(1);
        expect(rules[0]?.type).toBe(RULE_TYPE_IDS.MockResponse);
        expect(rules[0]?.action).toMatchObject({
            overrideStatus: true,
            status: 503,
            overrideBody: false,
        });
    });

    test('toRules_WhenALiveInterceptionOnlyDelays_ShouldBuildADelayRule', () => {
        // Arrange
        const stored = {
            interceptionRules: [
                anInterception({
                    responseSource: 2,
                    statusCodeOverride: null,
                }),
            ],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules.map(rule => rule.type)).toEqual([RULE_TYPE_IDS.Delay]);
    });

    test('toRules_WhenTheMethodIsAny_ShouldSkipTheMethodCriterion', () => {
        // Arrange
        const stored = {
            interceptionRules: [
                anInterception({
                    method: '*',
                }),
            ],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules[0]?.criteria.items.map(item => item.field)).toEqual([CRITERION_FIELD_IDS.Url]);
    });

    test('toRules_WhenARedirectUsesARegex_ShouldBuildARewriteWithAUrlRegexCondition', () => {
        // Arrange
        const stored = {
            redirectRules: [
                {
                    id: 'redirect-1',
                    enabled: false,
                    name: '',
                    kind: 2,
                    source: '^https://api\\.example\\.com/(.*)$',
                    target: 'http://localhost:5000/$1',
                    strictParameters: true,
                },
            ],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules[0]).toMatchObject({
            enabled: false,
            name: '^https://api\\.example\\.com/(.*)$',
            type: RULE_TYPE_IDS.Rewrite,
            action: {
                target: 'http://localhost:5000/$1',
            },
        });
        expect(rules[0]?.criteria.items).toEqual([
            {
                field: CRITERION_FIELD_IDS.Url,
                op: CRITERION_OPERATOR_IDS.Regex,
                name: '',
                value: '^https://api\\.example\\.com/(.*)$',
                negate: false,
            },
        ]);
    });

    test('toRules_WhenARedirectIsAMirror_ShouldBuildARewriteWithAPathSuffixRegex', () => {
        // Arrange
        const stored = {
            redirectRules: [
                {
                    id: 'mirror-1',
                    enabled: true,
                    name: 'Local',
                    kind: 1,
                    source: 'https://api.example.com/',
                    target: 'http://localhost:5000',
                    strictParameters: false,
                },
            ],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules[0]).toMatchObject({
            type: RULE_TYPE_IDS.Rewrite,
            action: {
                target: 'http://localhost:5000$1',
            },
        });
        expect(rules[0]?.criteria.items).toEqual([
            {
                field: CRITERION_FIELD_IDS.Url,
                op: CRITERION_OPERATOR_IDS.Regex,
                name: '',
                value: '^https://api\\.example\\.com((?:[/?#].*)?)$',
                negate: false,
            },
        ]);
    });

    test('toRules_WhenARedirectHasAnIdAndAName_ShouldKeepThem', () => {
        // Arrange
        const stored = {
            redirectRules: [aRedirect({})],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules[0]).toMatchObject({
            id: 'redirect-1',
            name: 'Local',
        });
    });

    test.each([
        undefined,
        null,
        '',
    ])('toRules_WhenARedirectIdIs(%s)_ShouldGenerateANewId', id => {
        // Arrange
        vi.spyOn(crypto, 'randomUUID').mockReturnValue(GENERATED_ID);
        const stored = {
            redirectRules: [aRedirect({ id })],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules[0]?.id).toBe(GENERATED_ID);
    });

    test.each([
        undefined,
        null,
        '',
    ])('toRules_WhenARedirectNameIs(%s)_ShouldFallBackToTheSource', name => {
        // Arrange
        const stored = {
            redirectRules: [aRedirect({ name })],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules[0]?.name).toBe(REDIRECT_SOURCE);
    });

    test('toRules_WhenAHeaderIsABearerToken_ShouldBuildARequestHeaderRule', () => {
        // Arrange
        const stored = {
            headerInjections: [
                {
                    id: 'header-1',
                    enabled: true,
                    domains: ['api.example.com'],
                    headerName: 'Authorization',
                    headerValue: 'Bearer abc.def',
                },
            ],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules[0]).toMatchObject({
            type: RULE_TYPE_IDS.RequestHeader,
            action: {
                operations: [
                    {
                        op: 'addOrUpdate',
                        name: 'Authorization',
                        value: 'Bearer abc.def',
                    },
                ],
            },
        });
        expect(rules[0]?.criteria.items[0]).toMatchObject({
            field: CRITERION_FIELD_IDS.Host,
            op: CRITERION_OPERATOR_IDS.Domains,
            value: 'api.example.com',
        });
    });

    test('toRules_WhenAHeaderIsNotAuthorization_ShouldBuildARequestHeaderRule', () => {
        // Arrange
        const stored = {
            headerInjections: [
                {
                    id: 'header-1',
                    enabled: true,
                    domains: [],
                    headerName: 'X-Tenant',
                    headerValue: 'blue',
                },
            ],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules[0]?.type).toBe(RULE_TYPE_IDS.RequestHeader);
        expect(rules[0]?.criteria.items).toEqual([]);
    });

    test.each([
        [
            false,
            [],
            0,
        ],
        [
            true,
            [],
            1,
        ],
        [
            false,
            ['api.example.com'],
            1,
        ],
    ])('toRules_WhenCorsIsEnabled(%s)WithDomains(%j)_ShouldBuild(%i)Rules', (
        enabled,
        domains,
        expected,
    ) => {
        // Arrange
        const stored = {
            cors: {
                enabled,
                domains,
                allowedOrigin: '*',
                allowedHeaders: '*',
            },
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules).toHaveLength(expected);
    });

    test('hasLegacyRules_WhenNoOldKeyExists_ShouldReturnFalse', () => {
        // Arrange
        const stored = {};

        // Act
        const hasLegacyRules = LegacySettingsMigration.hasLegacyRules(stored);

        // Assert
        expect(hasLegacyRules).toBe(false);
    });
});
