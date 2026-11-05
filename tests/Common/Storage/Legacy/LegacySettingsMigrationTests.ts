import { describe, expect, test } from "vitest";
import type { LegacyInterceptionRule } from "../../../../src/Common/Storage/Legacy/LegacySettings";
import { LegacySettingsMigration } from "../../../../src/Common/Storage/Legacy/LegacySettingsMigration";
import { CriterionFieldIds, CriterionOperatorIds } from "../../../../src/Contracts/Rules/Criterion";
import { RuleTypeIds } from "../../../../src/Contracts/Rules/RuleTypeIds";

function anInterception(overrides: Partial<LegacyInterceptionRule> = {}): LegacyInterceptionRule {
    return {
        id: "interception-1",
        enabled: true,
        method: "GET",
        urlPattern: "*/api/v1/users/*",
        responseSource: 1,
        statusCodeOverride: 201,
        mockContentType: "application/json",
        mockBody: "{\"id\":42}",
        baselineBody: "{\"id\":41}",
        delayInMilliseconds: 300,
        ...overrides,
    };
}

describe("LegacySettingsMigration", () => {
    test("toRules_WhenAnInterceptionServesAMockWithDelay_ShouldBuildALatencyRuleThenAMockRule", () => {
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
                "interception-1-latency",
                RuleTypeIds.Delay,
            ],
            [
                "interception-1",
                RuleTypeIds.MockResponse,
            ],
        ]);
        expect(rules[0]?.action).toEqual({
            delayMs: 300,
        });
        expect(rules[1]?.action).toMatchObject({
            overrideStatus: true,
            status: 201,
            overrideBody: true,
            body: "{\"id\":42}",
            baselineBody: "{\"id\":41}",
        });
        expect(rules[1]?.criteria.items.map(item => item.field)).toEqual([
            CriterionFieldIds.Method,
            CriterionFieldIds.Url,
        ]);
    });

    test("toRules_WhenALiveInterceptionOverridesTheStatus_ShouldBuildAStatusOnlyMockRule", () => {
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
        expect(rules[0]?.type).toBe(RuleTypeIds.MockResponse);
        expect(rules[0]?.action).toMatchObject({
            overrideStatus: true,
            status: 503,
            overrideBody: false,
        });
    });

    test("toRules_WhenALiveInterceptionOnlyDelays_ShouldBuildADelayRule", () => {
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
        expect(rules.map(rule => rule.type)).toEqual([RuleTypeIds.Delay]);
    });

    test("toRules_WhenTheMethodIsAny_ShouldSkipTheMethodCriterion", () => {
        // Arrange
        const stored = {
            interceptionRules: [
                anInterception({
                    method: "*",
                }),
            ],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules[0]?.criteria.items.map(item => item.field)).toEqual([CriterionFieldIds.Url]);
    });

    test("toRules_WhenARedirectUsesARegex_ShouldBuildARewriteWithAUrlRegexCondition", () => {
        // Arrange
        const stored = {
            redirectRules: [
                {
                    id: "redirect-1",
                    enabled: false,
                    name: "",
                    kind: 2,
                    source: "^https://api\\.example\\.com/(.*)$",
                    target: "http://localhost:5000/$1",
                    strictParameters: true,
                },
            ],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules[0]).toMatchObject({
            enabled: false,
            name: "^https://api\\.example\\.com/(.*)$",
            type: RuleTypeIds.Rewrite,
            action: {
                target: "http://localhost:5000/$1",
            },
        });
        expect(rules[0]?.criteria.items).toEqual([
            {
                field: CriterionFieldIds.Url,
                op: CriterionOperatorIds.Regex,
                name: "",
                value: "^https://api\\.example\\.com/(.*)$",
                negate: false,
            },
        ]);
    });

    test("toRules_WhenARedirectIsAMirror_ShouldBuildARewriteWithAPathSuffixRegex", () => {
        // Arrange
        const stored = {
            redirectRules: [
                {
                    id: "mirror-1",
                    enabled: true,
                    name: "Local",
                    kind: 1,
                    source: "https://api.example.com/",
                    target: "http://localhost:5000",
                    strictParameters: false,
                },
            ],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules[0]).toMatchObject({
            type: RuleTypeIds.Rewrite,
            action: {
                target: "http://localhost:5000$1",
            },
        });
        expect(rules[0]?.criteria.items).toEqual([
            {
                field: CriterionFieldIds.Url,
                op: CriterionOperatorIds.Regex,
                name: "",
                value: "^https://api\\.example\\.com((?:[/?#].*)?)$",
                negate: false,
            },
        ]);
    });

    test("toRules_WhenAHeaderIsABearerToken_ShouldBuildARequestHeaderRule", () => {
        // Arrange
        const stored = {
            headerInjections: [
                {
                    id: "header-1",
                    enabled: true,
                    domains: ["api.example.com"],
                    headerName: "Authorization",
                    headerValue: "Bearer abc.def",
                },
            ],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules[0]).toMatchObject({
            type: RuleTypeIds.RequestHeader,
            action: {
                operations: [
                    {
                        op: "addOrUpdate",
                        name: "Authorization",
                        value: "Bearer abc.def",
                    },
                ],
            },
        });
        expect(rules[0]?.criteria.items[0]).toMatchObject({
            field: CriterionFieldIds.Host,
            op: CriterionOperatorIds.Domains,
            value: "api.example.com",
        });
    });

    test("toRules_WhenAHeaderIsNotAuthorization_ShouldBuildARequestHeaderRule", () => {
        // Arrange
        const stored = {
            headerInjections: [
                {
                    id: "header-1",
                    enabled: true,
                    domains: [],
                    headerName: "X-Tenant",
                    headerValue: "blue",
                },
            ],
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules[0]?.type).toBe(RuleTypeIds.RequestHeader);
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
            ["api.example.com"],
            1,
        ],
    ])("toRules_WhenCorsIsEnabled(%s)WithDomains(%j)_ShouldBuild(%i)Rules", (
        enabled,
        domains,
        expected
    ) => {
        // Arrange
        const stored = {
            cors: {
                enabled,
                domains,
                allowedOrigin: "*",
                allowedHeaders: "*",
            },
        };

        // Act
        const rules = LegacySettingsMigration.toRules(stored);

        // Assert
        expect(rules).toHaveLength(expected);
    });

    test("hasLegacyRules_WhenNoOldKeyExists_ShouldReturnFalse", () => {
        // Arrange
        const stored = {};

        // Act
        const hasLegacyRules = LegacySettingsMigration.hasLegacyRules(stored);

        // Assert
        expect(hasLegacyRules).toBe(false);
    });
});
