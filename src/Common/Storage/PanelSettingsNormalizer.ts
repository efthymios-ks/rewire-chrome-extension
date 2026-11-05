import { type Criterion, CriteriaMatches, type RuleCriteria } from "../../Contracts/Rules/Criterion";
import type { Rule } from "../../Contracts/Rules/Rule";
import { DefaultPanelSettings, SettingsSchema } from "../../Contracts/Settings/DefaultPanelSettings";
import type { PanelSettings } from "../../Contracts/Settings/PanelSettings";
import type { LegacySettings } from "./Legacy/LegacySettings";
import { LegacySettingsMigration } from "./Legacy/LegacySettingsMigration";
import { SchemaVersion2Migration } from "./Migrations/SchemaVersion2Migration";
import { SchemaVersion3Migration } from "./Migrations/SchemaVersion3Migration";

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(
    record: RawRecord,
    key: string,
    fallback: string = ""
): string {
    const value = record[key];

    return typeof value === "string" ? value : fallback;
}

function flag(
    record: RawRecord,
    key: string,
    fallback: boolean
): boolean {
    const value = record[key];

    return typeof value === "boolean" ? value : fallback;
}

function strings(
    record: RawRecord,
    key: string,
    fallback: string[]
): string[] {
    const value = record[key];
    if (!Array.isArray(value)) {
        return fallback;
    }

    return value.filter((item): item is string => typeof item === "string");
}

function records(record: RawRecord, key: string): RawRecord[] {
    const value = record[key];

    return Array.isArray(value) ? value.filter(isRecord) : [];
}

function criterionOf(record: RawRecord): Criterion {
    return {
        field: text(record, "field"),
        op: text(record, "op"),
        name: text(record, "name"),
        value: text(record, "value"),
        negate: flag(
            record,
            "negate",
            false
        ),
    };
}

function criteriaOf(value: unknown): RuleCriteria {
    const record = isRecord(value) ? value : {};

    return {
        match: text(record, "match") === CriteriaMatches.Any ? CriteriaMatches.Any : CriteriaMatches.All,
        items: records(record, "items").map(criterionOf),
    };
}

function ruleOf(record: RawRecord): Rule {
    return {
        id: text(record, "id") || crypto.randomUUID(),
        name: text(record, "name"),
        enabled: flag(
            record,
            "enabled",
            true
        ),
        type: text(record, "type"),
        criteria: criteriaOf(record["criteria"]),
        action: isRecord(record["action"]) ? record["action"] : {},
    };
}

function storedRulesOf(record: RawRecord): RawRecord[] {
    const raw = record["schemaVersion"] === SettingsSchema.FirstRulesVersion
        ? SchemaVersion2Migration.rulesOf(record)
        : records(record, "rules");

    return Number(record["schemaVersion"] ?? 0) < SettingsSchema.CurrentVersion
        ? SchemaVersion3Migration.migrate(raw)
        : raw;
}

export const PanelSettingsNormalizer = {
    needsMigration(value: unknown): boolean {
        if (!isRecord(value)) {
            return false;
        }

        return value["schemaVersion"] !== SettingsSchema.CurrentVersion || LegacySettingsMigration.hasLegacyRules(value as LegacySettings);
    },

    normalize(value: unknown): PanelSettings {
        if (!isRecord(value)) {
            return DefaultPanelSettings;
        }

        const legacy = value as LegacySettings;
        const migratedRules = LegacySettingsMigration.hasLegacyRules(legacy) ? LegacySettingsMigration.toRules(legacy) : [];

        return {
            schemaVersion: SettingsSchema.CurrentVersion,
            interceptionEnabled: flag(
                value,
                "interceptionEnabled",
                DefaultPanelSettings.interceptionEnabled
            ),
            domainWhitelist: strings(
                value,
                "domainWhitelist",
                []
            ),
            pinnedEndpoints: strings(
                value,
                "pinnedEndpoints",
                []
            ),
            rules: [
                ...storedRulesOf(value).map(ruleOf),
                ...migratedRules,
            ],
            testerSamples: strings(
                value,
                "testerSamples",
                strings(
                    value,
                    "regexTesterSamples",
                    DefaultPanelSettings.testerSamples
                )
            ),
        };
    },
};
