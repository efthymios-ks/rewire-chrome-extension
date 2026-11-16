import { describe, expect, test } from 'vitest';
import { IMPORT_MODE } from './ImportMode';
import { ProfileTransfer } from './ProfileTransfer';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';
import { DEFAULT_PROFILE } from '../../../Contracts/Settings/DefaultProfile';
import type { PanelSettings } from '../../../Contracts/Settings/PanelSettings';
import { SETTINGS_SCHEMA } from '../../../Contracts/Settings/SettingsSchema';
import { aProfile, aRule, aSettings } from '../../../TestData';

const TOKEN_RULE = aRule({
    id: 'token',
    type: RULE_TYPE_IDS.RequestHeader,
    action: {
        operations: [
            {
                op: 'addOrUpdate',
                name: 'Authorization',
                value: 'Bearer secret',
            },
            {
                op: 'addOrUpdate',
                name: 'X-Debug',
                value: '1',
            },
        ],
    },
});

const COOKIE_RULE = aRule({
    id: 'cookie',
    type: RULE_TYPE_IDS.RequestCookie,
    action: {
        op: 'addOrUpdate',
        name: 'session',
        value: 'abc123',
    },
});

function twoProfiles(): PanelSettings {
    return aSettings({
        activeProfileId: 'local',
        profiles: [
            aProfile({
                id: 'local',
                name: 'Local',
                rules: [
                    TOKEN_RULE,
                    COOKIE_RULE,
                ],
                variables: [
                    {
                        name: 'baseUrl',
                        value: 'http://localhost:5000',
                    },
                    {
                        name: 'apiToken',
                        value: 'secret',
                    },
                ],
            }),
            aProfile({
                id: 'staging',
                name: 'Staging',
            }),
        ],
    });
}

function summaryOf(settings: PanelSettings): string[] {
    return settings.profiles.map(profile => {
        const ruleIds = profile.rules.map(rule => rule.id).join(',');

        return `${profile.id}:${profile.name}:${ruleIds}`;
    });
}

describe('ProfileTransfer', () => {
    test('export_WhenSomeProfilesAreTicked_ShouldWriteOnlyThoseInOneBundle', () => {
        // Arrange
        const settings = twoProfiles();

        // Act
        const bundle = ProfileTransfer.export({
            settings,
            profileIds: ['staging'],
            shouldIncludeSecrets: true,
        });

        // Assert
        expect(bundle.schemaVersion).toBe(SETTINGS_SCHEMA.CurrentVersion);
        expect(bundle.profiles.map(profile => profile.id)).toEqual(['staging']);
    });

    test('export_WhenSecretsAreExcluded_ShouldBlankAuthHeadersCookieValuesAndSecretVariables', () => {
        // Arrange
        const settings = twoProfiles();

        // Act
        const bundle = ProfileTransfer.export({
            settings,
            profileIds: ['local'],
            shouldIncludeSecrets: false,
        });

        // Assert
        const profile = bundle.profiles[0]!;
        expect(profile.rules[0]?.action['operations']).toEqual([
            {
                op: 'addOrUpdate',
                name: 'Authorization',
                value: '',
            },
            {
                op: 'addOrUpdate',
                name: 'X-Debug',
                value: '1',
            },
        ]);
        expect(profile.rules[1]?.action['value']).toBe('');
        expect(profile.variables).toEqual([
            {
                name: 'baseUrl',
                value: 'http://localhost:5000',
            },
            {
                name: 'apiToken',
                value: '',
            },
        ]);
    });

    test('export_WhenSecretsAreIncluded_ShouldKeepThem', () => {
        // Arrange
        const settings = twoProfiles();

        // Act
        const bundle = ProfileTransfer.export({
            settings,
            profileIds: ['local'],
            shouldIncludeSecrets: true,
        });

        // Assert
        expect(bundle.profiles).toEqual([settings.profiles[0]]);
    });

    test.each([
        [
            'not json',
            "The file isn't valid JSON.",
        ],
        [
            '[]',
            'The file must hold a JSON object.',
        ],
        [
            '{"schemaVersion":1,"rules":[]}',
            'Only schemaVersion 2 to 5 files can be imported.',
        ],
        [
            '{"schemaVersion":4}',
            'The file has no rules list.',
        ],
        [
            '{"schemaVersion":5,"profiles":[]}',
            'The file has no profiles.',
        ],
        [
            '{"schemaVersion":5,"profiles":[{"id":"p","name":"P","rules":[{"type":"teleport"}]}]}',
            'Unknown rule types: teleport.',
        ],
    ])('parse_WhenTheTextIs(%s)_ShouldFail', (text, expected) => {
        // Arrange
        const input = text;

        // Act
        const parsed = ProfileTransfer.parse(input);

        // Assert
        expect(parsed).toEqual({
            hasErrors: true,
            error: expected,
        });
    });

    test('parse_WhenTheBundleHoldsProfiles_ShouldReadEveryProfile', () => {
        // Arrange
        const exported = ProfileTransfer.export({
            settings: twoProfiles(),
            profileIds: [
                'local',
                'staging',
            ],
            shouldIncludeSecrets: true,
        });

        // Act
        const parsed = ProfileTransfer.parse(JSON.stringify(exported));

        // Assert
        expect(parsed.hasErrors ? [] : parsed.value.profiles).toEqual(exported.profiles);
    });

    test('parse_WhenTheFileIsARulesOnlyExport_ShouldReadItAsTheDefaultProfile', () => {
        // Arrange
        const text = JSON.stringify({
            schemaVersion: 4,
            rules: [aRule()],
        });

        // Act
        const parsed = ProfileTransfer.parse(text);

        // Assert
        expect(parsed.hasErrors ? [] : parsed.value.profiles).toEqual([
            {
                ...DEFAULT_PROFILE,
                rules: [aRule()],
            },
        ]);
    });

    test('parse_WhenTheBundleIsSchemaVersion2_ShouldMigrateItsRules', () => {
        // Arrange
        const text = JSON.stringify({
            schemaVersion: SETTINGS_SCHEMA.FirstRulesVersion,
            activeProfileId: 'default',
            profiles: [
                {
                    id: 'default',
                    name: 'Default',
                },
            ],
            rules: [
                {
                    id: 'status',
                    profileId: 'default',
                    name: 'Server error',
                    enabled: true,
                    type: 'statusOverride',
                    criteria: {
                        match: 'all',
                        items: [],
                    },
                    action: {
                        status: 500,
                    },
                },
            ],
        });

        // Act
        const parsed = ProfileTransfer.parse(text);

        // Assert
        expect(parsed.hasErrors ? [] : parsed.value.profiles[0]?.rules).toEqual([
            {
                id: 'status',
                name: 'Server error',
                enabled: true,
                type: RULE_TYPE_IDS.MockResponse,
                criteria: {
                    match: 'all',
                    items: [],
                },
                action: {
                    overrideStatus: true,
                    status: 500,
                    overrideBody: false,
                    contentType: '',
                    headers: [],
                    body: '',
                },
            },
        ]);
    });

    test('parse_WhenTheBundleIsSchemaVersion3WithAMirror_ShouldImportItAsARewrite', () => {
        // Arrange
        const text = JSON.stringify({
            schemaVersion: 3,
            rules: [
                aRule({
                    id: 'mirror',
                    type: 'environmentMirror',
                    criteria: {
                        match: 'all',
                        items: [],
                    },
                    action: {
                        sourceBase: 'https://api.example.com/',
                        targetBase: 'http://localhost:5000',
                    },
                }),
            ],
        });

        // Act
        const parsed = ProfileTransfer.parse(text);

        // Assert
        const rule = parsed.hasErrors ? undefined : parsed.value.profiles[0]?.rules[0];
        expect(rule?.type).toBe(RULE_TYPE_IDS.Rewrite);
        expect(rule?.action).toEqual({
            target: 'http://localhost:5000$1',
        });
        expect(rule?.criteria.items.map(item => item.op)).toEqual(['regex']);
    });

    test('apply_WhenMerging_ShouldPatchSameIdsAndAppendNewProfiles', () => {
        // Arrange
        const settings = twoProfiles();
        const incoming = [
            aProfile({
                id: 'local',
                name: 'Local v2',
                rules: [
                    aRule({
                        id: 'token',
                        name: 'Updated token',
                    }),
                    aRule({
                        id: 'new-rule',
                    }),
                ],
                variables: [
                    {
                        name: 'apiToken',
                        value: 'rotated',
                    },
                ],
            }),
            aProfile({
                id: 'qa',
                name: 'QA',
            }),
        ];

        // Act
        const applied = ProfileTransfer.apply({ settings, incoming, mode: IMPORT_MODE.Merge });

        // Assert
        expect(summaryOf(applied)).toEqual([
            'local:Local v2:token,cookie,new-rule',
            'staging:Staging:',
            'qa:QA:',
        ]);
        expect(applied.profiles[0]?.rules[0]?.name).toBe('Updated token');
        expect(applied.profiles[0]?.variables).toEqual([
            {
                name: 'baseUrl',
                value: 'http://localhost:5000',
            },
            {
                name: 'apiToken',
                value: 'rotated',
            },
        ]);
        expect(applied.activeProfileId).toBe('local');
    });

    test('apply_WhenReplacing_ShouldKeepOnlyTheImportedProfilesAndActivateTheFirst', () => {
        // Arrange
        const settings = twoProfiles();
        const incoming = [
            aProfile({
                id: 'qa',
                name: 'QA',
            }),
        ];

        // Act
        const applied = ProfileTransfer.apply({ settings, incoming, mode: IMPORT_MODE.Replace });

        // Assert
        expect(summaryOf(applied)).toEqual(['qa:QA:']);
        expect(applied.activeProfileId).toBe('qa');
    });

    test('apply_WhenReplacingWithTheActiveProfile_ShouldKeepItActive', () => {
        // Arrange
        const settings = twoProfiles();
        const incoming = [
            aProfile({
                id: 'qa',
            }),
            aProfile({
                id: 'local',
            }),
        ];

        // Act
        const applied = ProfileTransfer.apply({ settings, incoming, mode: IMPORT_MODE.Replace });

        // Assert
        expect(applied.activeProfileId).toBe('local');
    });

    test('apply_WhenNothingIsTicked_ShouldChangeNothing', () => {
        // Arrange
        const settings = twoProfiles();

        // Act
        const applied = ProfileTransfer.apply({ settings, incoming: [], mode: IMPORT_MODE.Replace });

        // Assert
        expect(applied).toBe(settings);
    });
});
