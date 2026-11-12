import type { Rule } from "../../../Contracts/Rules/Rule";
import { SettingsSchema } from "../../../Contracts/Settings/DefaultPanelSettings";
import type { PanelSettings } from "../../../Contracts/Settings/PanelSettings";
import type { RuleProfile } from "../../../Contracts/Settings/RuleProfile";
import { JsonText } from "../../Json/JsonText";
import { Result } from "../../Results/Result";
import { RuleTypeRegistry } from "../../Rules/Types/RuleTypeRegistry";
import { PanelSettingsNormalizer } from "../../Storage/PanelSettingsNormalizer";
import { ProfileVariables } from "../ProfileVariables";
import { ImportMode, type ProfileBundle } from "./ProfileBundle";

type RawRecord = Record<string, unknown>;
type ProfileReader = (record: RawRecord) => Result<RuleProfile[]>;
type ProfileImporter = (settings: PanelSettings, incoming: RuleProfile[]) => PanelSettings;

const RuleFileVersions: unknown[] = Array.from(
    { length: SettingsSchema.FirstProfilesVersion - SettingsSchema.FirstRulesVersion },
    (_unused, offset) => SettingsSchema.FirstRulesVersion + offset
);

function isRecord(value: unknown): value is RawRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withoutSecrets(rule: Rule): Rule {
    const type = RuleTypeRegistry.get(rule.type);
    if (type === undefined) {
        return rule;
    }

    return {
        ...rule,
        action: type.withoutSecrets(rule.action),
    };
}

function exportedProfile(profile: RuleProfile, includeSecrets: boolean): RuleProfile {
    if (includeSecrets) {
        return profile;
    }

    return {
        ...profile,
        rules: profile.rules.map(withoutSecrets),
        variables: ProfileVariables.withoutSecrets(profile.variables),
    };
}

function mergeRulesById(current: Rule[], incoming: Rule[]): Rule[] {
    const currentIds = new Set(current.map(item => item.id));

    return [
        ...current.map(item => incoming.find(candidate => candidate.id === item.id) ?? item),
        ...incoming.filter(item => !currentIds.has(item.id)),
    ];
}

function mergeProfile(current: RuleProfile, incoming: RuleProfile): RuleProfile {
    return {
        ...current,
        name: incoming.name,
        rules: mergeRulesById(current.rules, incoming.rules),
        variables: ProfileVariables.mergeByName(current.variables, incoming.variables),
    };
}

function unknownTypesIn(rules: Rule[]): string[] {
    return [
        ...new Set(rules
            .filter(rule => RuleTypeRegistry.get(rule.type) === undefined)
            .map(rule => rule.type)),
    ];
}

function checkedProfiles(profiles: RuleProfile[]): Result<RuleProfile[]> {
    const unknownTypes = unknownTypesIn(profiles.flatMap(profile => profile.rules));

    return unknownTypes.length > 0 ? Result.fail(`Unknown rule types: ${unknownTypes.join(", ")}.`) : Result.ok(profiles);
}

function readProfiles(record: RawRecord): Result<RuleProfile[]> {
    const raw = record["profiles"];
    if (!Array.isArray(raw) || raw.length === 0) {
        return Result.fail("The file has no profiles.");
    }

    return checkedProfiles(PanelSettingsNormalizer.normalize(record).profiles);
}

function readRules(record: RawRecord): Result<RuleProfile[]> {
    if (!Array.isArray(record["rules"])) {
        return Result.fail("The file has no rules list.");
    }

    return checkedProfiles(PanelSettingsNormalizer.normalize(record).profiles);
}

function readerOf(version: unknown): ProfileReader | undefined {
    if (version === SettingsSchema.CurrentVersion) {
        return readProfiles;
    }

    return RuleFileVersions.includes(version) ? readRules : undefined;
}

function replaceProfiles(settings: PanelSettings, incoming: RuleProfile[]): PanelSettings {
    const keepsActive = incoming.some(profile => profile.id === settings.activeProfileId);

    return {
        ...settings,
        activeProfileId: keepsActive ? settings.activeProfileId : incoming[0]!.id,
        profiles: incoming,
    };
}

function mergeProfiles(settings: PanelSettings, incoming: RuleProfile[]): PanelSettings {
    const currentIds = new Set(settings.profiles.map(profile => profile.id));

    return {
        ...settings,
        profiles: [
            ...settings.profiles.map(profile => {
                const match = incoming.find(candidate => candidate.id === profile.id);

                return match === undefined ? profile : mergeProfile(profile, match);
            }),
            ...incoming.filter(profile => !currentIds.has(profile.id)),
        ],
    };
}

const ProfileImporters: Record<ImportMode, ProfileImporter> = {
    [ImportMode.Merge]: mergeProfiles,
    [ImportMode.Replace]: replaceProfiles,
};

export const ProfileTransfer = {
    export(
        settings: PanelSettings,
        profileIds: string[],
        includeSecrets: boolean
    ): ProfileBundle {
        return {
            schemaVersion: SettingsSchema.CurrentVersion,
            profiles: settings.profiles
                .filter(profile => profileIds.includes(profile.id))
                .map(profile => exportedProfile(profile, includeSecrets)),
        };
    },

    parse(text: string): Result<ProfileBundle> {
        const parsed = JsonText.tryParse(text);
        if (parsed.hasErrors) {
            return Result.fail("The file isn't valid JSON.");
        }

        const value = parsed.value;
        if (!isRecord(value)) {
            return Result.fail("The file must hold a JSON object.");
        }

        const reader = readerOf(value["schemaVersion"]);
        if (reader === undefined) {
            return Result.fail(`Only schemaVersion ${SettingsSchema.FirstRulesVersion} to ${SettingsSchema.CurrentVersion} files can be imported.`);
        }

        const profiles = reader(value);
        if (profiles.hasErrors) {
            return Result.fail(profiles.error);
        }

        return Result.ok({
            schemaVersion: SettingsSchema.CurrentVersion,
            profiles: profiles.value,
        });
    },

    apply(
        settings: PanelSettings,
        incoming: RuleProfile[],
        mode: ImportMode
    ): PanelSettings {
        if (incoming.length === 0) {
            return settings;
        }

        return ProfileImporters[mode](settings, incoming);
    },
};
