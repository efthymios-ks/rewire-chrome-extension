import { describe, expect, test } from 'vitest';
import { ActiveProfile } from '../Profiles/ActiveProfile';
import { PanelSettingsNormalizer } from './PanelSettingsNormalizer';
import type { Rule } from '../../Contracts/Rules/Rule';
import { RULE_TYPE_IDS } from '../../Contracts/Rules/RuleTypeId';
import { DEFAULT_PANEL_SETTINGS } from '../../Contracts/Settings/DefaultPanelSettings';
import { DEFAULT_PROFILE } from '../../Contracts/Settings/DefaultProfile';
import type { PanelSettings } from '../../Contracts/Settings/PanelSettings';
import { SETTINGS_SCHEMA } from '../../Contracts/Settings/SettingsSchema';
import { aRule } from '../../TestData';

function rulesOf(settings: PanelSettings): Rule[] {
    return ActiveProfile.rules(settings);
}

describe('PanelSettingsNormalizer', () => {
    test.each([
        undefined,
        null,
        'text',
        [],
    ])('normalize_WhenStoredValueIs(%s)_ShouldReturnDefaults', stored => {
        // Arrange
        const value: unknown = stored;

        // Act
        const settings = PanelSettingsNormalizer.normalize(value);

        // Assert
        expect(settings).toEqual(DEFAULT_PANEL_SETTINGS);
    });

    test('normalize_WhenStoredValueIsPartial_ShouldKeepStoredValuesAndFillTheRest', () => {
        // Arrange
        const stored = {
            schemaVersion: SETTINGS_SCHEMA.CurrentVersion,
            interceptionEnabled: false,
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(settings.interceptionEnabled).toBe(false);
        expect(settings.profiles).toEqual([DEFAULT_PROFILE]);
        expect(settings.activeProfileId).toBe(DEFAULT_PROFILE.id);
        expect(settings.testerSamples).toEqual(DEFAULT_PANEL_SETTINGS.testerSamples);
    });

    test('normalize_WhenStoredSettingsAreSchemaVersion2_ShouldMigrateRulesIntoTheDefaultProfile', () => {
        // Arrange
        const stored = {
            schemaVersion: SETTINGS_SCHEMA.FirstRulesVersion,
            activeProfileId: 'default',
            profiles: [
                {
                    id: 'default',
                    name: 'Default',
                },
            ],
            theme: 'dark',
            rules: [
                {
                    ...aRule(),
                    profileId: 'default',
                    type: 'removeQueryParams',
                    action: {
                        keys: ['utm_*'],
                    },
                },
            ],
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(settings.profiles.map(profile => profile.id)).toEqual([DEFAULT_PROFILE.id]);
        expect(settings.activeProfileId).toBe(DEFAULT_PROFILE.id);
        expect(settings).not.toHaveProperty('theme');
        expect(rulesOf(settings)).toEqual([
            {
                ...aRule(),
                type: RULE_TYPE_IDS.QueryParams,
                action: {
                    operations: [
                        {
                            op: 'remove',
                            name: 'utm_*',
                            value: '',
                        },
                    ],
                },
            },
        ]);
    });

    test('normalize_WhenStoredSettingsAreCurrent_ShouldKeepRulesAsTheyAre', () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.RequestHeader,
            action: {
                operations: [
                    {
                        op: 'set',
                        name: 'X-Env',
                        value: 'staging',
                    },
                ],
            },
        });
        const stored = {
            schemaVersion: SETTINGS_SCHEMA.CurrentVersion,
            activeProfileId: 'local',
            profiles: [
                {
                    id: 'local',
                    name: 'Local',
                    rules: [rule],
                    variables: [],
                },
            ],
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(rulesOf(settings)).toEqual([rule]);
    });

    test('normalize_WhenAMockStillStoresItsBaselineBody_ShouldDropIt', () => {
        // Arrange
        const rule = aRule();
        const stored = {
            schemaVersion: 4,
            domainWhitelist: ['example.com'],
            rules: [
                {
                    ...rule,
                    action: {
                        ...rule.action,
                        baselineBody: '{"id":42}',
                    },
                },
            ],
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(rulesOf(settings)[0]?.action).toEqual(rule.action);
        expect(settings).not.toHaveProperty('domainWhitelist');
    });

    test('normalize_WhenOnlyTheOldTesterSamplesExist_ShouldKeepThem', () => {
        // Arrange
        const stored = {
            regexTesterSamples: ['https://api.example.com/a'],
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(settings.testerSamples).toEqual(['https://api.example.com/a']);
    });

    test('normalize_WhenLegacyRulesExist_ShouldAppendThemAsRulesAndDropTheOldKeys', () => {
        // Arrange
        const stored = {
            redirectRules: [
                {
                    id: 'redirect-1',
                    enabled: true,
                    name: 'Local',
                    kind: 1,
                    source: 'https://api.example.com',
                    target: 'http://localhost:5000',
                    strictParameters: false,
                },
            ],
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(rulesOf(settings).map(rule => rule.type)).toEqual([RULE_TYPE_IDS.Rewrite]);
        expect(settings).not.toHaveProperty('redirectRules');
        expect(settings.schemaVersion).toBe(SETTINGS_SCHEMA.CurrentVersion);
    });

    test('normalize_WhenStoredSettingsAreSchemaVersion3_ShouldFoldOldRedirectsIntoRewrite', () => {
        // Arrange
        const stored = {
            schemaVersion: 3,
            rules: [
                aRule({
                    id: 'silent',
                    type: 'redirect',
                    action: {
                        target: 'http://localhost:5000/users',
                        status: 0,
                    },
                }),
                aRule({
                    id: 'status',
                    type: 'redirect',
                    action: {
                        target: 'https://example.com/moved',
                        status: 301,
                    },
                }),
                aRule({
                    id: 'mirror',
                    type: 'environmentMirror',
                    action: {
                        sourceBase: 'https://api.example.com',
                        targetBase: 'http://localhost:5000',
                    },
                }),
            ],
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(rulesOf(settings).map(rule => [
            rule.id,
            rule.type,
        ])).toEqual([
            [
                'silent',
                RULE_TYPE_IDS.Rewrite,
            ],
            [
                'status',
                RULE_TYPE_IDS.Redirect,
            ],
            [
                'mirror',
                RULE_TYPE_IDS.Rewrite,
            ],
        ]);
    });

    test('normalize_WhenStoredSettingsAreSchemaVersion4_ShouldMoveRulesIntoTheDefaultProfile', () => {
        // Arrange
        const redirect = aRule({
            id: 'moved',
            type: RULE_TYPE_IDS.Redirect,
            action: {
                target: 'https://example.com/moved',
                status: 308,
            },
        });
        const stored = {
            schemaVersion: 4,
            rules: [redirect],
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(settings.profiles).toEqual([
            {
                ...DEFAULT_PROFILE,
                rules: [redirect],
            },
        ]);
        expect(settings.activeProfileId).toBe(DEFAULT_PROFILE.id);
    });

    test('normalize_WhenTheActiveProfileIsUnknown_ShouldActivateTheFirstProfile', () => {
        // Arrange
        const stored = {
            schemaVersion: SETTINGS_SCHEMA.CurrentVersion,
            activeProfileId: 'gone',
            profiles: [
                {
                    id: 'local',
                    name: 'Local',
                },
                {
                    id: 'staging',
                    name: 'Staging',
                },
            ],
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(settings.activeProfileId).toBe('local');
    });

    test('normalize_WhenTheProfileListIsEmpty_ShouldFallBackToTheDefaultProfile', () => {
        // Arrange
        const stored = {
            schemaVersion: SETTINGS_SCHEMA.CurrentVersion,
            profiles: [],
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(settings.profiles).toEqual([DEFAULT_PROFILE]);
        expect(settings.activeProfileId).toBe(DEFAULT_PROFILE.id);
    });

    test('normalize_WhenAProfileHasOddVariables_ShouldTrimNamesAndDropNamelessOnes', () => {
        // Arrange
        const stored = {
            schemaVersion: SETTINGS_SCHEMA.CurrentVersion,
            profiles: [
                {
                    id: 'local',
                    name: ' ',
                    variables: [
                        {
                            name: ' baseUrl ',
                            value: 'http://localhost:5000',
                        },
                        {
                            name: '',
                            value: 'orphan',
                        },
                        {
                            name: 'count',
                            value: 3,
                        },
                    ],
                },
            ],
        };

        // Act
        const settings = PanelSettingsNormalizer.normalize(stored);

        // Assert
        expect(settings.profiles[0]?.name).toBe('Profile');
        expect(settings.profiles[0]?.variables).toEqual([
            {
                name: 'baseUrl',
                value: 'http://localhost:5000',
            },
            {
                name: 'count',
                value: '',
            },
        ]);
    });

    test.each([
        [
            {
                schemaVersion: SETTINGS_SCHEMA.CurrentVersion,
            },
            false,
        ],
        [
            {
                schemaVersion: 4,
            },
            true,
        ],
        [
            {
                schemaVersion: 1,
            },
            true,
        ],
        [
            {
                schemaVersion: SETTINGS_SCHEMA.FirstRulesVersion,
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
                schemaVersion: SETTINGS_SCHEMA.CurrentVersion,
                cors: {
                    enabled: false,
                    domains: [],
                    allowedOrigin: '*',
                    allowedHeaders: '*',
                },
            },
            true,
        ],
        [
            'text',
            false,
        ],
    ])('needsMigration_WhenStoredValueIs(%j)_ShouldReturn(%s)', (stored, expected) => {
        // Arrange
        const value: unknown = stored;

        // Act
        const needsMigration = PanelSettingsNormalizer.needsMigration(value);

        // Assert
        expect(needsMigration).toBe(expected);
    });
});
