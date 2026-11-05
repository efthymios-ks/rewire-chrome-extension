import type { Rule } from "../../../Contracts/Rules/Rule";
import { SettingsSchema } from "../../../Contracts/Settings/DefaultPanelSettings";
import type { PanelSettings } from "../../../Contracts/Settings/PanelSettings";
import { JsonText } from "../../Json/JsonText";
import { Result } from "../../Results/Result";
import { PanelSettingsNormalizer } from "../../Storage/PanelSettingsNormalizer";
import { RuleTypeRegistry } from "../Types/RuleTypeRegistry";
import { ImportMode, type RuleBundle } from "./RuleBundle";

type RawRecord = Record<string, unknown>;

const ImportableVersions: unknown[] = Array.from(
    { length: SettingsSchema.CurrentVersion - SettingsSchema.FirstRulesVersion + 1 },
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

function mergeById(current: Rule[], incoming: Rule[]): Rule[] {
    const currentIds = new Set(current.map(item => item.id));

    return [
        ...current.map(item => incoming.find(candidate => candidate.id === item.id) ?? item),
        ...incoming.filter(item => !currentIds.has(item.id)),
    ];
}

export const RuleTransfer = {
    export(settings: PanelSettings, includeSecrets: boolean): RuleBundle {
        return {
            schemaVersion: SettingsSchema.CurrentVersion,
            rules: includeSecrets ? settings.rules : settings.rules.map(withoutSecrets),
        };
    },

    parse(text: string): Result<RuleBundle> {
        const parsed = JsonText.tryParse(text);
        if (parsed.hasErrors) {
            return Result.fail("The file isn't valid JSON.");
        }

        const value = parsed.value;
        if (!isRecord(value)) {
            return Result.fail("The file must hold a JSON object.");
        }

        if (!ImportableVersions.includes(value["schemaVersion"])) {
            return Result.fail(`Only schemaVersion ${SettingsSchema.FirstRulesVersion} to ${SettingsSchema.CurrentVersion} files can be imported.`);
        }

        if (!Array.isArray(value["rules"])) {
            return Result.fail("The file has no rules list.");
        }

        const normalized = PanelSettingsNormalizer.normalize(value);
        const unknownTypes = normalized.rules.filter(rule => RuleTypeRegistry.get(rule.type) === undefined);
        if (unknownTypes.length > 0) {
            return Result.fail(`Unknown rule types: ${[...new Set(unknownTypes.map(rule => rule.type))].join(", ")}.`);
        }

        return Result.ok({
            schemaVersion: SettingsSchema.CurrentVersion,
            rules: normalized.rules,
        });
    },

    apply(
        settings: PanelSettings,
        bundle: RuleBundle,
        mode: ImportMode
    ): PanelSettings {
        return {
            ...settings,
            rules: mode === ImportMode.Replace ? bundle.rules : mergeById(settings.rules, bundle.rules),
        };
    },
};
