import { describe, expect, test } from "vitest";
import { ImportMode } from "../../../../src/Common/Rules/Transfer/RuleBundle";
import { RuleTransfer } from "../../../../src/Common/Rules/Transfer/RuleTransfer";
import { RuleTypeIds } from "../../../../src/Contracts/Rules/RuleTypeIds";
import { SettingsSchema } from "../../../../src/Contracts/Settings/DefaultPanelSettings";
import { aRule, aSettings } from "../../../TestData";

const TokenRule = aRule({
    id: "token",
    type: RuleTypeIds.RequestHeader,
    action: {
        operations: [
            {
                op: "addOrUpdate",
                name: "Authorization",
                value: "Bearer secret",
            },
            {
                op: "addOrUpdate",
                name: "X-Debug",
                value: "1",
            },
        ],
    },
});

const CookieRule = aRule({
    id: "cookie",
    type: RuleTypeIds.RequestCookie,
    action: {
        op: "addOrUpdate",
        name: "session",
        value: "abc123",
    },
});

describe("RuleTransfer", () => {
    test("export_WhenSecretsAreExcluded_ShouldBlankAuthHeadersAndCookieValues", () => {
        // Arrange
        const settings = aSettings({
            rules: [
                TokenRule,
                CookieRule,
            ],
        });

        // Act
        const bundle = RuleTransfer.export(settings, false);

        // Assert
        expect(bundle.rules[0]?.action["operations"]).toEqual([
            {
                op: "addOrUpdate",
                name: "Authorization",
                value: "",
            },
            {
                op: "addOrUpdate",
                name: "X-Debug",
                value: "1",
            },
        ]);
        expect(bundle.rules[1]?.action["value"]).toBe("");
        expect(bundle.rules[1]?.action["name"]).toBe("session");
    });

    test("export_WhenSecretsAreIncluded_ShouldKeepThem", () => {
        // Arrange
        const settings = aSettings({
            rules: [
                TokenRule,
                CookieRule,
            ],
        });

        // Act
        const bundle = RuleTransfer.export(settings, true);

        // Assert
        expect(bundle.rules).toEqual([
            TokenRule,
            CookieRule,
        ]);
        expect(bundle.schemaVersion).toBe(SettingsSchema.CurrentVersion);
    });

    test.each([
        [
            "not json",
            "The file isn't valid JSON.",
        ],
        [
            "[]",
            "The file must hold a JSON object.",
        ],
        [
            "{\"schemaVersion\":1,\"rules\":[]}",
            "Only schemaVersion 2 to 4 files can be imported.",
        ],
        [
            "{\"schemaVersion\":4}",
            "The file has no rules list.",
        ],
        [
            "{\"schemaVersion\":4,\"rules\":[{\"type\":\"teleport\"}]}",
            "Unknown rule types: teleport.",
        ],
    ])("parse_WhenTheTextIs(%s)_ShouldFail", (text, expected) => {
        // Arrange
        const input = text;

        // Act
        const parsed = RuleTransfer.parse(input);

        // Assert
        expect(parsed).toEqual({
            hasErrors: true,
            error: expected,
        });
    });

    test("parse_WhenTheBundleIsValid_ShouldNormalizeRules", () => {
        // Arrange
        const text = JSON.stringify({
            schemaVersion: SettingsSchema.CurrentVersion,
            rules: [aRule()],
        });

        // Act
        const parsed = RuleTransfer.parse(text);

        // Assert
        expect(parsed.hasErrors).toBe(false);
        expect(parsed.hasErrors ? [] : parsed.value.rules).toEqual([aRule()]);
    });

    test("parse_WhenTheBundleIsSchemaVersion2_ShouldMigrateItsRules", () => {
        // Arrange
        const text = JSON.stringify({
            schemaVersion: SettingsSchema.FirstRulesVersion,
            activeProfileId: "default",
            profiles: [
                {
                    id: "default",
                    name: "Default",
                },
            ],
            rules: [
                {
                    id: "status",
                    profileId: "default",
                    name: "Server error",
                    enabled: true,
                    type: "statusOverride",
                    criteria: {
                        match: "all",
                        items: [],
                    },
                    action: {
                        status: 500,
                    },
                },
            ],
        });

        // Act
        const parsed = RuleTransfer.parse(text);

        // Assert
        expect(parsed.hasErrors ? [] : parsed.value.rules).toEqual([
            {
                id: "status",
                name: "Server error",
                enabled: true,
                type: RuleTypeIds.MockResponse,
                criteria: {
                    match: "all",
                    items: [],
                },
                action: {
                    overrideStatus: true,
                    status: 500,
                    overrideBody: false,
                    contentType: "",
                    headers: [],
                    body: "",
                    baselineBody: "",
                },
            },
        ]);
    });

    test("parse_WhenTheBundleIsSchemaVersion3WithAMirror_ShouldImportItAsARewrite", () => {
        // Arrange
        const text = JSON.stringify({
            schemaVersion: 3,
            rules: [
                aRule({
                    id: "mirror",
                    type: "environmentMirror",
                    criteria: {
                        match: "all",
                        items: [],
                    },
                    action: {
                        sourceBase: "https://api.example.com/",
                        targetBase: "http://localhost:5000",
                    },
                }),
            ],
        });

        // Act
        const parsed = RuleTransfer.parse(text);

        // Assert
        const rule = parsed.hasErrors ? undefined : parsed.value.rules[0];
        expect(rule?.type).toBe(RuleTypeIds.Rewrite);
        expect(rule?.action).toEqual({
            target: "http://localhost:5000$1",
        });
        expect(rule?.criteria.items.map(item => item.op)).toEqual(["regex"]);
    });

    test("apply_WhenMerging_ShouldReplaceSameIdsAndAppendNewOnes", () => {
        // Arrange
        const settings = aSettings({
            rules: [
                aRule({
                    id: "a",
                    name: "Old",
                }),
            ],
        });
        const bundle = {
            schemaVersion: SettingsSchema.CurrentVersion,
            rules: [
                aRule({
                    id: "a",
                    name: "New",
                }),
                aRule({
                    id: "b",
                }),
            ],
        };

        // Act
        const applied = RuleTransfer.apply(
            settings,
            bundle,
            ImportMode.Merge
        );

        // Assert
        expect(applied.rules.map(rule => `${rule.id}:${rule.name}`)).toEqual([
            "a:New",
            "b:Users mock",
        ]);
    });

    test("apply_WhenReplacing_ShouldKeepOnlyTheImportedRules", () => {
        // Arrange
        const settings = aSettings({
            rules: [aRule()],
        });
        const imported = aRule({
            id: "imported",
        });
        const bundle = {
            schemaVersion: SettingsSchema.CurrentVersion,
            rules: [imported],
        };

        // Act
        const applied = RuleTransfer.apply(
            settings,
            bundle,
            ImportMode.Replace
        );

        // Assert
        expect(applied.rules).toEqual([imported]);
    });
});
