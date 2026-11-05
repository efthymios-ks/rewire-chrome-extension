import { CriterionFieldIds, CriterionOperatorIds } from "../../../Contracts/Rules/Criterion";
import { RuleTypeIds } from "../../../Contracts/Rules/RuleTypeIds";
import { RegexText } from "../../Urls/RegexText";

type RawRecord = Record<string, unknown>;

const LegacyRedirectTypeId = "redirect";
const LegacyMirrorTypeId = "environmentMirror";
const SilentRedirectStatus = 0;
const TrailingSlashesPattern = /\/+$/;

function isRecord(value: unknown): value is RawRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(record: RawRecord, key: string): string {
    const value = record[key];

    return typeof value === "string" ? value : "";
}

function records(record: RawRecord, key: string): RawRecord[] {
    const value = record[key];

    return Array.isArray(value) ? value.filter(isRecord) : [];
}

function actionOf(rule: RawRecord): RawRecord {
    return isRecord(rule["action"]) ? rule["action"] : {};
}

function criteriaOf(rule: RawRecord): RawRecord {
    return isRecord(rule["criteria"]) ? rule["criteria"] : {};
}

function withExtraCriterion(rule: RawRecord, criterion: RawRecord): RawRecord {
    const criteria = criteriaOf(rule);

    return {
        ...rule,
        criteria: {
            ...criteria,
            items: [
                ...records(criteria, "items"),
                criterion,
            ],
        },
    };
}

function mirrorRegex(sourceBase: string): string {
    return `^${RegexText.escape(sourceBase.trim().replace(TrailingSlashesPattern, ""))}((?:[/?#].*)?)$`;
}

function mirrorTarget(targetBase: string): string {
    return `${targetBase.trim().replace(TrailingSlashesPattern, "")}$1`;
}

function fromLegacyRedirect(rule: RawRecord): RawRecord {
    const action = actionOf(rule);
    const status = Number(action["status"] ?? SilentRedirectStatus);
    if (status === SilentRedirectStatus) {
        return {
            ...rule,
            type: RuleTypeIds.Rewrite,
            action: {
                target: text(action, "target"),
            },
        };
    }

    return {
        ...rule,
        type: RuleTypeIds.Redirect,
        action: {
            target: text(action, "target"),
            status,
        },
    };
}

function fromLegacyMirror(rule: RawRecord): RawRecord {
    const action = actionOf(rule);
    const sourceBase = text(action, "sourceBase");
    const targetBase = text(action, "targetBase");
    const rewrite: RawRecord = {
        ...rule,
        type: RuleTypeIds.Rewrite,
        action: {
            target: mirrorTarget(targetBase),
        },
    };
    if (sourceBase === "") {
        return rewrite;
    }

    return withExtraCriterion(rewrite, {
        field: CriterionFieldIds.Url,
        op: CriterionOperatorIds.Regex,
        name: "",
        value: mirrorRegex(sourceBase),
        negate: false,
    });
}

export const SchemaVersion3Migration = {
    migrate(rules: RawRecord[]): RawRecord[] {
        return rules.map(rule => SchemaVersion3Migration.migrateRule(rule));
    },

    migrateRule(rule: RawRecord): RawRecord {
        switch (text(rule, "type")) {
            case LegacyRedirectTypeId:
                return fromLegacyRedirect(rule);
            case LegacyMirrorTypeId:
                return fromLegacyMirror(rule);
            default:
                return rule;
        }
    },
};
