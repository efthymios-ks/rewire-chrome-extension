import { CRITERIA_MATCHES } from '../../Contracts/Rules/CriteriaMatches';
import type { Criterion } from '../../Contracts/Rules/Criterion';
import type { Rule } from '../../Contracts/Rules/Rule';
import type { RuleCriteria } from '../../Contracts/Rules/RuleCriteria';
import { DEFAULT_PANEL_SETTINGS } from '../../Contracts/Settings/DefaultPanelSettings';
import { DEFAULT_PROFILE } from '../../Contracts/Settings/DefaultProfile';
import type { PanelSettings } from '../../Contracts/Settings/PanelSettings';
import type { ProfileVariable } from '../../Contracts/Settings/ProfileVariable';
import type { RuleProfile } from '../../Contracts/Settings/RuleProfile';
import { SETTINGS_SCHEMA } from '../../Contracts/Settings/SettingsSchema';
import { RawRecords } from '../Objects/RawRecords';
import type { LegacySettings } from './Legacy/LegacySettings';
import { LegacySettingsMigration } from './Legacy/LegacySettingsMigration';
import { SchemaVersion2Migration } from './Migrations/SchemaVersion2Migration';
import { SchemaVersion3Migration } from './Migrations/SchemaVersion3Migration';

type RawRecord = Record<string, unknown>;

const RETIRED_ACTION_KEYS = [
    'baselineBody',
];

const UNNAMED_PROFILE = 'Profile';

interface TextOptions {
    record: RawRecord;
    key: string;
    fallback?: string;
}

function text({ record, key, fallback = '' }: TextOptions): string {
    const value = record[key];

    return typeof value === 'string' ? value : fallback;
}

interface FlagOptions {
    record: RawRecord;
    key: string;
    fallback: boolean;
}

function flag({ record, key, fallback }: FlagOptions): boolean {
    const value = record[key];

    return typeof value === 'boolean' ? value : fallback;
}

interface StringsOptions {
    record: RawRecord;
    key: string;
    fallback: string[];
}

function strings({ record, key, fallback }: StringsOptions): string[] {
    const value = record[key];
    if (!Array.isArray(value)) {
        return fallback;
    }

    return value.filter((item): item is string => typeof item === 'string');
}

function criterionOf(record: RawRecord): Criterion {
    return {
        field: text({ record, key: 'field' }),
        op: text({ record, key: 'op' }),
        name: text({ record, key: 'name' }),
        value: text({ record, key: 'value' }),
        negate: flag({ record, key: 'negate', fallback: false }),
    };
}

function criteriaOf(value: unknown): RuleCriteria {
    const record = RawRecords.is(value) ? value : {};

    return {
        match: text({
            record,
            key: 'match',
        }) === CRITERIA_MATCHES.Any ? CRITERIA_MATCHES.Any : CRITERIA_MATCHES.All,
        items: RawRecords.records(record, 'items').map(criterionOf),
    };
}

function actionOf(value: unknown): RawRecord {
    if (!RawRecords.is(value)) {
        return {};
    }

    return Object.fromEntries(Object
        .entries(value)
        .filter(([key]) => !RETIRED_ACTION_KEYS.includes(key)));
}

function ruleOf(record: RawRecord): Rule {
    const id = text({ record, key: 'id' });

    return {
        id: id === '' ? crypto.randomUUID() : id,
        name: text({ record, key: 'name' }),
        enabled: flag({ record, key: 'enabled', fallback: true }),
        type: text({ record, key: 'type' }),
        criteria: criteriaOf(record['criteria']),
        action: actionOf(record['action']),
    };
}

function storedRulesOf(record: RawRecord): RawRecord[] {
    const raw = record['schemaVersion'] === SETTINGS_SCHEMA.FirstRulesVersion
        ? SchemaVersion2Migration.rulesOf(record)
        : RawRecords.records(record, 'rules');

    return Number(record['schemaVersion'] ?? 0) < SETTINGS_SCHEMA.FirstRewriteVersion
        ? SchemaVersion3Migration.migrate(raw)
        : raw;
}

function variableOf(record: RawRecord): ProfileVariable {
    return {
        name: text({ record, key: 'name' }).trim(),
        value: text({ record, key: 'value' }),
    };
}

function profileOf(record: RawRecord): RuleProfile {
    const id = text({ record, key: 'id' });
    const name = text({ record, key: 'name' }).trim();

    return {
        id: id === '' ? crypto.randomUUID() : id,
        name: name === '' ? UNNAMED_PROFILE : name,
        rules: RawRecords.records(record, 'rules').map(ruleOf),
        variables: RawRecords.records(record, 'variables')
            .map(variableOf)
            .filter(variable => variable.name !== ''),
    };
}

function hasProfiles(record: RawRecord): boolean {
    return Number(record['schemaVersion'] ?? 0) >= SETTINGS_SCHEMA.FirstProfilesVersion;
}

function profilesOf(record: RawRecord): RuleProfile[] {
    if (hasProfiles(record)) {
        const profiles = RawRecords.records(record, 'profiles').map(profileOf);

        return profiles.length === 0 ? [DEFAULT_PROFILE] : profiles;
    }

    const legacy = record as LegacySettings;
    const migratedRules = LegacySettingsMigration.hasLegacyRules(legacy)
        ? LegacySettingsMigration.toRules(legacy)
        : [];

    return [
        {
            ...DEFAULT_PROFILE,
            rules: [
                ...storedRulesOf(record).map(ruleOf),
                ...migratedRules,
            ],
        },
    ];
}

function activeProfileIdOf(record: RawRecord, profiles: RuleProfile[]): string {
    const stored = text({ record, key: 'activeProfileId' });
    const isKnown = hasProfiles(record) && profiles.some(profile => profile.id === stored);

    return isKnown ? stored : profiles[0]?.id ?? DEFAULT_PROFILE.id;
}

export const PanelSettingsNormalizer = {
    needsMigration(value: unknown): boolean {
        if (!RawRecords.is(value)) {
            return false;
        }

        return value['schemaVersion'] !== SETTINGS_SCHEMA.CurrentVersion
            || LegacySettingsMigration.hasLegacyRules(value as LegacySettings);
    },

    normalize(value: unknown): PanelSettings {
        if (!RawRecords.is(value)) {
            return DEFAULT_PANEL_SETTINGS;
        }

        const profiles = profilesOf(value);

        return {
            schemaVersion: SETTINGS_SCHEMA.CurrentVersion,
            interceptionEnabled: flag({
                record: value,
                key: 'interceptionEnabled',
                fallback: DEFAULT_PANEL_SETTINGS.interceptionEnabled,
            }),
            pinnedEndpoints: strings({ record: value, key: 'pinnedEndpoints', fallback: [] }),
            activeProfileId: activeProfileIdOf(value, profiles),
            profiles,
            testerSamples: strings({
                record: value,
                key: 'testerSamples',
                fallback: strings({
                    record: value,
                    key: 'regexTesterSamples',
                    fallback: DEFAULT_PANEL_SETTINGS.testerSamples,
                }),
            }),
        };
    },
};
