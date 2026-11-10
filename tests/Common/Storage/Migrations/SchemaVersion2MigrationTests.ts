import { describe, expect, test } from "vitest";
import { OperationKinds } from "../../../../src/Common/Rules/Types/OperationKinds";
import { SchemaVersion2Migration } from "../../../../src/Common/Storage/Migrations/SchemaVersion2Migration";
import { RuleTypeIds } from "../../../../src/Contracts/Rules/RuleTypeIds";

type RawRecord = Record<string, unknown>;

const ActiveProfileId = "default";

function aStoredRule(overrides: RawRecord = {}): RawRecord {
    return {
        id: "rule-1",
        profileId: ActiveProfileId,
        name: "Rule",
        enabled: true,
        type: RuleTypeIds.RequestHeader,
        criteria: {
            match: "all",
            items: [],
        },
        action: {
            operations: [],
        },
        ...overrides,
    };
}

function aCriterion(overrides: RawRecord = {}): RawRecord {
    return {
        field: "url",
        op: "wildcard",
        name: "",
        value: "*/api/*",
        negate: false,
        ...overrides,
    };
}

function migrate(...rules: RawRecord[]): RawRecord[] {
    return SchemaVersion2Migration.rulesOf({
        schemaVersion: 2,
        activeProfileId: ActiveProfileId,
        rules,
    });
}

function onlyRuleOf(rule: RawRecord): RawRecord {
    const migrated = migrate(rule);
    expect(migrated).toHaveLength(1);

    return migrated[0]!;
}

function itemsOf(rule: RawRecord): RawRecord[] {
    return (rule["criteria"] as RawRecord)["items"] as RawRecord[];
}

describe("SchemaVersion2Migration", () => {
    test("rulesOf_WhenARuleHasAProfile_ShouldDropTheProfileId", () => {
        // Arrange
        const rule = aStoredRule();

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated).not.toHaveProperty("profileId");
        expect(migrated["enabled"]).toBe(true);
    });

    test("rulesOf_WhenARuleBelongsToAnotherProfile_ShouldKeepItDisabled", () => {
        // Arrange
        const rule = aStoredRule({
            profileId: "staging",
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated["enabled"]).toBe(false);
    });

    test("rulesOf_WhenThereIsNoActiveProfile_ShouldKeepEveryRuleAsItWas", () => {
        // Arrange
        const settings = {
            schemaVersion: 2,
            rules: [
                aStoredRule({
                    profileId: "staging",
                }),
            ],
        };

        // Act
        const migrated = SchemaVersion2Migration.rulesOf(settings);

        // Assert
        expect(migrated[0]?.["enabled"]).toBe(true);
    });

    test("rulesOf_WhenTheTypeWasRegexRedirect_ShouldBecomeARedirectWithAUrlRegexCondition", () => {
        // Arrange
        const rule = aStoredRule({
            type: "regexRedirect",
            action: {
                regex: "^https://api\\.example\\.com/users/(\\d+)$",
                template: "http://localhost:5000/users/$1",
                strictParameters: true,
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated["type"]).toBe(RuleTypeIds.Redirect);
        expect(migrated["action"]).toEqual({
            target: "http://localhost:5000/users/$1",
            status: 0,
        });
        expect(itemsOf(migrated)).toEqual([
            {
                field: "url",
                op: "regex",
                name: "",
                value: "^https://api\\.example\\.com/users/(\\d+)$",
                negate: false,
            },
        ]);
    });

    test("rulesOf_WhenTheTypeWasRedirectWithStatus_ShouldBecomeARedirectWithThatStatus", () => {
        // Arrange
        const rule = aStoredRule({
            type: "redirectWithStatus",
            action: {
                targetUrl: "https://example.com/moved",
                status: 301,
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated["type"]).toBe(RuleTypeIds.Redirect);
        expect(migrated["action"]).toEqual({
            target: "https://example.com/moved",
            status: 301,
        });
    });

    test("rulesOf_WhenTheTypeWasAddQueryParams_ShouldAddOrUpdateEachParam", () => {
        // Arrange
        const rule = aStoredRule({
            type: "addQueryParams",
            action: {
                params: [
                    {
                        key: "debug",
                        value: "true",
                    },
                ],
                replaceOnly: false,
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated["type"]).toBe(RuleTypeIds.QueryParams);
        expect(migrated["action"]).toEqual({
            operations: [
                {
                    op: OperationKinds.AddOrUpdate,
                    name: "debug",
                    value: "true",
                },
            ],
        });
    });

    test("rulesOf_WhenTheTypeWasRemoveQueryParams_ShouldRemoveEachKey", () => {
        // Arrange
        const rule = aStoredRule({
            type: "removeQueryParams",
            action: {
                keys: [
                    "utm_*",
                    "fbclid",
                ],
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated["type"]).toBe(RuleTypeIds.QueryParams);
        expect(migrated["action"]).toEqual({
            operations: [
                {
                    op: OperationKinds.Remove,
                    name: "utm_*",
                    value: "",
                },
                {
                    op: OperationKinds.Remove,
                    name: "fbclid",
                    value: "",
                },
            ],
        });
    });

    test("rulesOf_WhenTheTypeWasStatusOverride_ShouldBecomeAMockOfTheStatusOnly", () => {
        // Arrange
        const rule = aStoredRule({
            type: "statusOverride",
            action: {
                status: 503,
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated["type"]).toBe(RuleTypeIds.MockResponse);
        expect(migrated["action"]).toEqual({
            overrideStatus: true,
            status: 503,
            overrideBody: false,
            contentType: "",
            headers: [],
            body: "",
        });
    });

    test("rulesOf_WhenTheTypeWasMockResponse_ShouldOverrideStatusAndBody", () => {
        // Arrange
        const rule = aStoredRule({
            type: RuleTypeIds.MockResponse,
            action: {
                status: 200,
                body: "{}",
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated["action"]).toEqual({
            status: 200,
            body: "{}",
            overrideStatus: true,
            overrideBody: true,
        });
    });

    test.each([
        [
            "Bearer",
            "abc",
            "Bearer abc",
        ],
        [
            "",
            "raw-token",
            "raw-token",
        ],
    ])("rulesOf_WhenTheTypeWasAuthTokenWithScheme(%s)_ShouldAddOrUpdateTheHeaderTo(%s)", (
        scheme,
        token,
        expected
    ) => {
        // Arrange
        const rule = aStoredRule({
            type: "authToken",
            action: {
                headerName: "Authorization",
                scheme,
                token,
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated["type"]).toBe(RuleTypeIds.RequestHeader);
        expect(migrated["action"]).toEqual({
            operations: [
                {
                    op: OperationKinds.AddOrUpdate,
                    name: "Authorization",
                    value: expected,
                },
            ],
        });
    });

    test.each([
        [
            "set",
            OperationKinds.AddOrUpdate,
        ],
        [
            "append",
            OperationKinds.Add,
        ],
        [
            "remove",
            OperationKinds.Remove,
        ],
    ])("rulesOf_WhenAHeaderOperationWas(%s)_ShouldBecome(%s)", (oldOperation, expected) => {
        // Arrange
        const rule = aStoredRule({
            type: RuleTypeIds.ResponseHeader,
            action: {
                operations: [
                    {
                        op: oldOperation,
                        name: "Cache-Control",
                        value: "no-store",
                    },
                ],
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated["action"]).toEqual({
            operations: [
                {
                    op: expected,
                    name: "Cache-Control",
                    value: "no-store",
                },
            ],
        });
    });

    test.each([
        [
            RuleTypeIds.RequestCookie,
            "set",
            OperationKinds.AddOrUpdate,
        ],
        [
            RuleTypeIds.RequestCookie,
            "remove",
            OperationKinds.Remove,
        ],
        [
            RuleTypeIds.ResponseCookie,
            "add",
            OperationKinds.Add,
        ],
        [
            RuleTypeIds.ResponseCookie,
            "modify",
            OperationKinds.AddOrUpdate,
        ],
    ])("rulesOf_WhenA(%s)OperationWas(%s)_ShouldBecome(%s)", (
        type,
        oldOperation,
        expected
    ) => {
        // Arrange
        const rule = aStoredRule({
            type,
            action: {
                op: oldOperation,
                name: "session",
                value: "abc",
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated["action"]).toEqual({
            op: expected,
            name: "session",
            value: "abc",
        });
    });

    test.each([
        [
            "equals",
            "https://api.example.com/a*b?",
            "wildcard",
            "https://api.example.com/a\\*b\\?",
        ],
        [
            "contains",
            "/users",
            "wildcard",
            "*/users*",
        ],
        [
            "baseUrl",
            "https://api.example.com/",
            "regex",
            "^https://api\\.example\\.com(?:[/?#].*)?$",
        ],
        [
            "wildcard",
            "*/api/*",
            "wildcard",
            "*/api/*",
        ],
    ])("rulesOf_WhenAnOperatorWas(%s)_ShouldBecomeAnEquivalent", (
        op,
        value,
        expectedOperator,
        expectedValue
    ) => {
        // Arrange
        const rule = aStoredRule({
            criteria: {
                match: "all",
                items: [
                    aCriterion({
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
            aCriterion({
                op: expectedOperator,
                value: expectedValue,
            }),
        ]);
    });

    test.each([
        "device",
        "clientIp",
        "country",
    ])("rulesOf_WhenASimulatedCondition(%s)IsUsed_ShouldDropItAndDisableTheRule", field => {
        // Arrange
        const rule = aStoredRule({
            criteria: {
                match: "all",
                items: [
                    aCriterion(),
                    aCriterion({
                        field,
                        op: "oneOf",
                        value: "GR",
                    }),
                ],
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(itemsOf(migrated)).toEqual([aCriterion()]);
        expect(migrated["enabled"]).toBe(false);
    });

    test.each([
        "blockRequest",
        "networkFailure",
        "failoverResponse",
        "phasedRelease",
        "abSegment",
        "loadBalancer",
        "headerFindReplace",
        "requestId",
        "bulkRedirects",
    ])("rulesOf_WhenTheTypeWas(%s)_ShouldDropTheRule", type => {
        // Arrange
        const rule = aStoredRule({
            type,
        });

        // Act
        const migrated = migrate(rule);

        // Assert
        expect(migrated).toEqual([]);
    });

    test("rulesOf_WhenARuleHadLatency_ShouldPlaceALatencyRuleBeforeIt", () => {
        // Arrange
        const criteria = {
            match: "all",
            items: [aCriterion()],
        };
        const rule = aStoredRule({
            id: "mock-1",
            name: "Users mock",
            type: RuleTypeIds.MockResponse,
            criteria,
            action: {
                status: 200,
                body: "{}",
                delayMs: 1500,
            },
        });

        // Act
        const migrated = migrate(rule);

        // Assert
        expect(migrated).toEqual([
            {
                id: "mock-1-latency",
                name: "Users mock latency",
                enabled: true,
                type: RuleTypeIds.Delay,
                criteria,
                action: {
                    delayMs: 1500,
                },
            },
            {
                id: "mock-1",
                name: "Users mock",
                enabled: true,
                type: RuleTypeIds.MockResponse,
                criteria,
                action: {
                    status: 200,
                    body: "{}",
                    overrideStatus: true,
                    overrideBody: true,
                },
            },
        ]);
    });

    test("rulesOf_WhenAMergedTypeHadLatency_ShouldKeepTheLatencyBeforeTheNewType", () => {
        // Arrange
        const rule = aStoredRule({
            id: "status-1",
            name: "Server error",
            type: "statusOverride",
            action: {
                status: 503,
                delayMs: 2000,
            },
        });

        // Act
        const migrated = migrate(rule);

        // Assert
        expect(migrated.map(item => [
            item["id"],
            item["type"],
            item["action"],
        ])).toEqual([
            [
                "status-1-latency",
                RuleTypeIds.Delay,
                {
                    delayMs: 2000,
                },
            ],
            [
                "status-1",
                RuleTypeIds.MockResponse,
                {
                    overrideStatus: true,
                    status: 503,
                    overrideBody: false,
                    contentType: "",
                    headers: [],
                    body: "",
                },
            ],
        ]);
    });

    test("rulesOf_WhenADroppedTypeHadLatency_ShouldDropBoth", () => {
        // Arrange
        const rule = aStoredRule({
            type: "blockRequest",
            action: {
                delayMs: 2000,
            },
        });

        // Act
        const migrated = migrate(rule);

        // Assert
        expect(migrated).toEqual([]);
    });

    test("rulesOf_WhenALatencyIsZero_ShouldOnlyDropTheKey", () => {
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
        expect(migrated["action"]).toEqual({
            operations: [],
        });
    });

    test("rulesOf_WhenTheRuleIsALatencyRule_ShouldKeepItsDelay", () => {
        // Arrange
        const rule = aStoredRule({
            type: RuleTypeIds.Delay,
            action: {
                delayMs: 2000,
            },
        });

        // Act
        const migrated = onlyRuleOf(rule);

        // Assert
        expect(migrated["action"]).toEqual({
            delayMs: 2000,
        });
    });
});
