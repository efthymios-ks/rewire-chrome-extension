import type { Rule } from '../../../Contracts/Rules/Rule';
import type { PanelSettings } from '../../../Contracts/Settings/PanelSettings';
import type { RuleProfile } from '../../../Contracts/Settings/RuleProfile';
import { SETTINGS_SCHEMA } from '../../../Contracts/Settings/SettingsSchema';
import { mergeBy } from '../../Collections/mergeBy';
import { JsonText } from '../../Json/JsonText';
import { RawRecords } from '../../Objects/RawRecords';
import { Result } from '../../Results/Result';
import { RuleTypeRegistry } from '../../Rules/Types/RuleTypeRegistry';
import { PanelSettingsNormalizer } from '../../Storage/PanelSettingsNormalizer';
import { ProfileVariables } from '../ProfileVariables';
import { IMPORT_MODE, type ImportMode } from './ImportMode';
import type { ProfileBundle } from './ProfileBundle';

type RawRecord = Record<string, unknown>;
type ProfileReader = (record: RawRecord) => Result<RuleProfile[]>;
type ProfileImporter = (settings: PanelSettings, incoming: RuleProfile[]) => PanelSettings;

const RULE_FILE_VERSIONS: unknown[] = Array.from(
    /* iterable: */ { length: SETTINGS_SCHEMA.FirstProfilesVersion - SETTINGS_SCHEMA.FirstRulesVersion },
    /* mapfn: */ (_unused, offset) => SETTINGS_SCHEMA.FirstRulesVersion + offset,
);

function withoutSecrets(rule: Rule): Rule {
    const type = RuleTypeRegistry.get(rule.type);
    if (type == null) {
        return rule;
    }

    return {
        ...rule,
        action: type.withoutSecrets(rule.action),
    };
}

function exportedProfile(profile: RuleProfile, shouldIncludeSecrets: boolean): RuleProfile {
    if (shouldIncludeSecrets) {
        return profile;
    }

    return {
        ...profile,
        rules: profile.rules.map(withoutSecrets),
        variables: ProfileVariables.withoutSecrets(profile.variables),
    };
}

function mergeProfile(current: RuleProfile, incoming: RuleProfile): RuleProfile {
    return {
        ...current,
        name: incoming.name,
        rules: mergeBy({
            current: current.rules,
            incoming: incoming.rules,
            keyOf: rule => rule.id,
        }),
        variables: ProfileVariables.mergeByName(current.variables, incoming.variables),
    };
}

function unknownTypesIn(rules: Rule[]): string[] {
    return [
        ...new Set(rules
            .filter(rule => RuleTypeRegistry.get(rule.type) == null)
            .map(rule => rule.type)),
    ];
}

function checkedProfiles(profiles: RuleProfile[]): Result<RuleProfile[]> {
    const unknownTypes = unknownTypesIn(profiles.flatMap(profile => profile.rules));

    return unknownTypes.length > 0
        ? Result.fail(`Unknown rule types: ${unknownTypes.join(', ')}.`)
        : Result.ok(profiles);
}

function readProfiles(record: RawRecord): Result<RuleProfile[]> {
    const raw = record['profiles'];
    if (!Array.isArray(raw) || raw.length === 0) {
        return Result.fail('The file has no profiles.');
    }

    return checkedProfiles(PanelSettingsNormalizer.normalize(record).profiles);
}

function readRules(record: RawRecord): Result<RuleProfile[]> {
    if (!Array.isArray(record['rules'])) {
        return Result.fail('The file has no rules list.');
    }

    return checkedProfiles(PanelSettingsNormalizer.normalize(record).profiles);
}

function readerOf(version: unknown): ProfileReader | undefined {
    if (version === SETTINGS_SCHEMA.CurrentVersion) {
        return readProfiles;
    }

    return RULE_FILE_VERSIONS.includes(version) ? readRules : undefined;
}

function replaceProfiles(settings: PanelSettings, incoming: RuleProfile[]): PanelSettings {
    const keepsActive = incoming.some(profile => profile.id === settings.activeProfileId);

    return {
        ...settings,
        activeProfileId: keepsActive ? settings.activeProfileId : incoming[0]?.id ?? settings.activeProfileId,
        profiles: incoming,
    };
}

function mergeProfiles(settings: PanelSettings, incoming: RuleProfile[]): PanelSettings {
    return {
        ...settings,
        profiles: mergeBy({
            current: settings.profiles,
            incoming,
            keyOf: profile => profile.id,
            combine: mergeProfile,
        }),
    };
}

const PROFILE_IMPORTERS: Record<ImportMode, ProfileImporter> = {
    [IMPORT_MODE.Merge]: mergeProfiles,
    [IMPORT_MODE.Replace]: replaceProfiles,
};

export interface ExportOptions {
    settings: PanelSettings;
    profileIds: string[];
    shouldIncludeSecrets: boolean;
}

export interface ApplyOptions {
    settings: PanelSettings;
    incoming: RuleProfile[];
    mode: ImportMode;
}

export const ProfileTransfer = {
    export({ settings, profileIds, shouldIncludeSecrets }: ExportOptions): ProfileBundle {
        return {
            schemaVersion: SETTINGS_SCHEMA.CurrentVersion,
            profiles: settings.profiles
                .filter(profile => profileIds.includes(profile.id))
                .map(profile => exportedProfile(profile, shouldIncludeSecrets)),
        };
    },

    parse(text: string): Result<ProfileBundle> {
        const parsed = JsonText.tryParse(text);
        if (parsed.hasErrors) {
            return Result.fail("The file isn't valid JSON.");
        }

        const value = parsed.value;
        if (!RawRecords.is(value)) {
            return Result.fail('The file must hold a JSON object.');
        }

        const reader = readerOf(value['schemaVersion']);
        if (reader == null) {
            return Result.fail(`Only schemaVersion ${SETTINGS_SCHEMA.FirstRulesVersion} to ${SETTINGS_SCHEMA.CurrentVersion} files can be imported.`);
        }

        const profiles = reader(value);
        if (profiles.hasErrors) {
            return Result.fail(profiles.error);
        }

        return Result.ok({
            schemaVersion: SETTINGS_SCHEMA.CurrentVersion,
            profiles: profiles.value,
        });
    },

    apply({ settings, incoming, mode }: ApplyOptions): PanelSettings {
        if (incoming.length === 0) {
            return settings;
        }

        return PROFILE_IMPORTERS[mode](settings, incoming);
    },
};
