import { describe, expect, test } from "vitest";
import { PanelSettingsNormalizer } from "../../../src/Common/Storage/PanelSettingsNormalizer";
import { RuleTypeIds } from "../../../src/Contracts/Rules/RuleTypeIds";
import { DefaultPanelSettings, SettingsSchema } from "../../../src/Contracts/Settings/DefaultPanelSettings";
import { aRule } from "../../TestData";

describe("PanelSettingsNormalizer", () => {
    test.each([
        undefined,
        null,
        "text",
        [],
    ])("normalize_WhenStoredValueIs(%s)_ShouldReturnDefaults", stored => {
        // Arrange
        const value: unknown = stored;

        // Act
        const settings = PanelSettingsNormalizer.normalize(value);

        // Assert
        expect(settings).toEqual(DefaultPanelSettings);
    });

    test("normalize_WhenStoredValueIsPartial_ShouldKeepStoredValuesAndFillTheRest", () => {
        // Arrange
        const stored = {
            schemaVersion: SettingsSchema.CurrentVersion,
            interceptionEnabled: false,
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(settings.interceptionEnabled).toBe(false);
        expect(settings.rules).toEqual([]);
        expect(settings.testerSamples).toEqual(DefaultPanelSettings.testerSamples);
    });

    test("normalize_WhenStoredSettingsAreSchemaVersion2_ShouldMigrateRulesAndDropProfiles", () => {
        // Arrange
        const stored = {
            schemaVersion: SettingsSchema.FirstRulesVersion,
            activeProfileId: "default",
            profiles: [
                {
                    id: "default",
                    name: "Default",
                },
            ],
            theme: "dark",
            rules: [
                {
                    ...aRule(),
                    profileId: "default",
                    type: "removeQueryParams",
                    action: {
                        keys: ["utm_*"],
                    },
                },
            ],
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(settings).not.toHaveProperty("profiles");
        expect(settings).not.toHaveProperty("activeProfileId");
        expect(settings).not.toHaveProperty("theme");
        expect(settings.rules).toEqual([
            {
                ...aRule(),
                type: RuleTypeIds.QueryParams,
                action: {
                    operations: [
                        {
                            op: "remove",
                            name: "utm_*",
                            value: "",
                        },
                    ],
                },
            },
        ]);
    });

    test("normalize_WhenStoredSettingsAreCurrent_ShouldKeepRulesAsTheyAre", () => {
        // Arrange
        const rule = aRule({
            type: RuleTypeIds.RequestHeader,
            action: {
                operations: [
                    {
                        op: "set",
                        name: "X-Env",
                        value: "staging",
                    },
                ],
            },
        });
        const stored = {
            schemaVersion: SettingsSchema.CurrentVersion,
            rules: [rule],
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(settings.rules).toEqual([rule]);
    });

    test("normalize_WhenOnlyTheOldTesterSamplesExist_ShouldKeepThem", () => {
        // Arrange
        const stored = {
            regexTesterSamples: ["https://api.example.com/a"],
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(settings.testerSamples).toEqual(["https://api.example.com/a"]);
    });

    test("normalize_WhenLegacyRulesExist_ShouldAppendThemAsRulesAndDropTheOldKeys", () => {
        // Arrange
        const stored = {
            redirectRules: [
                {
                    id: "redirect-1",
                    enabled: true,
                    name: "Local",
                    kind: 1,
                    source: "https://api.example.com",
                    target: "http://localhost:5000",
                    strictParameters: false,
                },
            ],
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(settings.rules.map(rule => rule.type)).toEqual([RuleTypeIds.Rewrite]);
        expect(settings).not.toHaveProperty("redirectRules");
        expect(settings.schemaVersion).toBe(SettingsSchema.CurrentVersion);
    });

    test("normalize_WhenStoredSettingsAreSchemaVersion3_ShouldFoldOldRedirectsIntoRewrite", () => {
        // Arrange
        const stored = {
            schemaVersion: 3,
            rules: [
                aRule({
                    id: "silent",
                    type: "redirect",
                    action: {
                        target: "http://localhost:5000/users",
                        status: 0,
                    },
                }),
                aRule({
                    id: "status",
                    type: "redirect",
                    action: {
                        target: "https://example.com/moved",
                        status: 301,
                    },
                }),
                aRule({
                    id: "mirror",
                    type: "environmentMirror",
                    action: {
                        sourceBase: "https://api.example.com",
                        targetBase: "http://localhost:5000",
                    },
                }),
            ],
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(settings.rules.map(rule => [
            rule.id,
            rule.type,
        ])).toEqual([
            [
                "silent",
                RuleTypeIds.Rewrite,
            ],
            [
                "status",
                RuleTypeIds.Redirect,
            ],
            [
                "mirror",
                RuleTypeIds.Rewrite,
            ],
        ]);
    });

    test.each([
        [
            {
                schemaVersion: SettingsSchema.CurrentVersion,
            },
            false,
        ],
        [
            {
                schemaVersion: 1,
            },
            true,
        ],
        [
            {
                schemaVersion: SettingsSchema.FirstRulesVersion,
            },
            true,
        ],
        [
            {
                schemaVersion: 3,
            },
            true,
        ],
        [
            {
                schemaVersion: SettingsSchema.CurrentVersion,
                cors: {
                    enabled: false,
                    domains: [],
                    allowedOrigin: "*",
                    allowedHeaders: "*",
                },
            },
            true,
        ],
        [
            "text",
            false,
        ],
    ])("needsMigration_WhenStoredValueIs(%j)_ShouldReturn(%s)", (stored, expected) => {
        // Arrange
        const value: unknown = stored;

        // Act
        const needsMigration = PanelSettingsNormalizer.needsMigration(value);

        // Assert
        expect(needsMigration).toBe(expected);
    });
});
