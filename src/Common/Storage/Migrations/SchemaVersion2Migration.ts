import { CriterionFieldIds, CriterionOperatorIds } from "../../../Contracts/Rules/Criterion";
import { RuleTypeIds } from "../../../Contracts/Rules/RuleTypeIds";
import { RegexText } from "../../Urls/RegexText";
import { WildcardPattern } from "../../Urls/WildcardPattern";
import { OperationKinds } from "../../Rules/Types/OperationKinds";

type RawRecord = Record<string, unknown>;

interface StoredRule {
    rule: RawRecord;
    isActiveProfile: boolean;
}

const LegacyTypeIds = {
    AuthToken: "authToken",
    RegexRedirect: "regexRedirect",
    RedirectWithStatus: "redirectWithStatus",
    AddQueryParams: "addQueryParams",
    RemoveQueryParams: "removeQueryParams",
    StatusOverride: "statusOverride",
} as const;

const LegacyOperatorIds = {
    Equals: "equals",
    Contains: "contains",
    BaseUrl: "baseUrl",
} as const;

const SimulatedFieldIds = [
    "device",
    "clientIp",
    "country",
];

const HeaderOperationNames: Record<string, string> = {
    set: OperationKinds.AddOrUpdate,
    append: OperationKinds.Add,
    remove: OperationKinds.Remove,
};

const CookieOperationNames: Record<string, string> = {
    set: OperationKinds.AddOrUpdate,
    add: OperationKinds.Add,
    modify: OperationKinds.AddOrUpdate,
    remove: OperationKinds.Remove,
};

const DelayKey = "delayMs";
const LatencySuffix = " latency";
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

function strings(record: RawRecord, key: string): string[] {
    const value = record[key];

    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function actionOf(rule: RawRecord): RawRecord {
    return isRecord(rule["action"]) ? rule["action"] : {};
}

function criteriaOf(rule: RawRecord): RawRecord {
    return isRecord(rule["criteria"]) ? rule["criteria"] : {};
}

function withCriterion(rule: RawRecord, criterion: RawRecord): RawRecord {
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

function renamedOperations(action: RawRecord, names: Record<string, string>): RawRecord[] {
    return records(action, "operations").map(operation => ({
        ...operation,
        op: names[text(operation, "op")] ?? OperationKinds.AddOrUpdate,
    }));
}

type TypeMigration = (rule: RawRecord) => RawRecord;

const TypeMigrations: Record<string, TypeMigration> = {
    [LegacyTypeIds.AuthToken]: rule => {
        const action = actionOf(rule);
        const scheme = text(action, "scheme");
        const token = text(action, "token");

        return {
            ...rule,
            type: RuleTypeIds.RequestHeader,
            action: {
                operations: [
                    {
                        op: OperationKinds.AddOrUpdate,
                        name: text(action, "headerName") || "Authorization",
                        value: scheme === "" ? token : `${scheme} ${token}`,
                    },
                ],
            },
        };
    },
    [LegacyTypeIds.RegexRedirect]: rule => {
        const action = actionOf(rule);

        return withCriterion(
            {
                ...rule,
                type: RuleTypeIds.Redirect,
                action: {
                    target: text(action, "template"),
                    status: 0,
                },
            },
            {
                field: CriterionFieldIds.Url,
                op: CriterionOperatorIds.Regex,
                name: "",
                value: text(action, "regex"),
                negate: false,
            }
        );
    },
    [LegacyTypeIds.RedirectWithStatus]: rule => {
        const action = actionOf(rule);

        return {
            ...rule,
            type: RuleTypeIds.Redirect,
            action: {
                target: text(action, "targetUrl"),
                status: action["status"] ?? 0,
            },
        };
    },
    [LegacyTypeIds.AddQueryParams]: rule => ({
        ...rule,
        type: RuleTypeIds.QueryParams,
        action: {
            operations: records(actionOf(rule), "params").map(param => ({
                op: OperationKinds.AddOrUpdate,
                name: text(param, "key"),
                value: text(param, "value"),
            })),
        },
    }),
    [LegacyTypeIds.RemoveQueryParams]: rule => ({
        ...rule,
        type: RuleTypeIds.QueryParams,
        action: {
            operations: strings(actionOf(rule), "keys").map(key => ({
                op: OperationKinds.Remove,
                name: key,
                value: "",
            })),
        },
    }),
    [LegacyTypeIds.StatusOverride]: rule => ({
        ...rule,
        type: RuleTypeIds.MockResponse,
        action: {
            overrideStatus: true,
            status: actionOf(rule)["status"],
            overrideBody: false,
            contentType: "",
            headers: [],
            body: "",
        },
    }),
    [RuleTypeIds.RequestHeader]: rule => ({
        ...rule,
        action: {
            ...actionOf(rule),
            operations: renamedOperations(actionOf(rule), HeaderOperationNames),
        },
    }),
    [RuleTypeIds.ResponseHeader]: rule => ({
        ...rule,
        action: {
            ...actionOf(rule),
            operations: renamedOperations(actionOf(rule), HeaderOperationNames),
        },
    }),
    [RuleTypeIds.RequestCookie]: rule => ({
        ...rule,
        action: {
            ...actionOf(rule),
            op: CookieOperationNames[text(actionOf(rule), "op")] ?? OperationKinds.AddOrUpdate,
        },
    }),
    [RuleTypeIds.ResponseCookie]: rule => ({
        ...rule,
        action: {
            ...actionOf(rule),
            op: CookieOperationNames[text(actionOf(rule), "op")] ?? OperationKinds.Add,
        },
    }),
    [RuleTypeIds.MockResponse]: rule => ({
        ...rule,
        action: {
            ...actionOf(rule),
            overrideStatus: true,
            overrideBody: true,
        },
    }),
};

const KeptTypeIds: string[] = Object.values(RuleTypeIds);

type OperatorMigration = (value: string) => {
    op: string;
    value: string;
};

const OperatorMigrations: Record<string, OperatorMigration> = {
    [LegacyOperatorIds.Equals]: value => ({
        op: CriterionOperatorIds.Wildcard,
        value: WildcardPattern.escape(value),
    }),
    [LegacyOperatorIds.Contains]: value => ({
        op: CriterionOperatorIds.Wildcard,
        value: `*${WildcardPattern.escape(value)}*`,
    }),
    [LegacyOperatorIds.BaseUrl]: value => ({
        op: CriterionOperatorIds.Regex,
        value: `^${RegexText.escape(value.trim().replace(TrailingSlashesPattern, ""))}(?:[/?#].*)?$`,
    }),
};

function migratedCriterion(criterion: RawRecord): RawRecord {
    const migration = OperatorMigrations[text(criterion, "op")];

    return migration === undefined
        ? criterion
        : {
            ...criterion,
            ...migration(text(criterion, "value")),
        };
}

function migratedCriteria(rule: RawRecord): RawRecord {
    const criteria = criteriaOf(rule);
    const items = records(criteria, "items");
    const kept = items.filter(item => !SimulatedFieldIds.includes(text(item, "field")));

    return {
        ...rule,
        enabled: kept.length === items.length ? rule["enabled"] : false,
        criteria: {
            ...criteria,
            items: kept.map(migratedCriterion),
        },
    };
}

function withoutDelay(rule: RawRecord): RawRecord[] {
    const action = actionOf(rule);
    const delay = action[DelayKey];
    if (rule["type"] === RuleTypeIds.Delay || typeof delay !== "number") {
        return [rule];
    }

    const { [DelayKey]: _removed, ...rest } = action;
    const plain = {
        ...rule,
        action: rest,
    };
    if (delay <= 0) {
        return [plain];
    }

    return [
        {
            ...rule,
            id: `${text(rule, "id")}-latency`,
            name: `${text(rule, "name")}${LatencySuffix}`,
            type: RuleTypeIds.Delay,
            action: {
                [DelayKey]: delay,
            },
        },
        plain,
    ];
}

function typedRule(rule: RawRecord): RawRecord {
    const migration = TypeMigrations[text(rule, "type")];

    return migration === undefined ? rule : migration(rule);
}

function isKept(rule: RawRecord): boolean {
    return KeptTypeIds.includes(text(typedRule(rule), "type"));
}

function migratedRule(stored: StoredRule): RawRecord[] {
    if (!isKept(stored.rule)) {
        return [];
    }

    return withoutDelay(stored.rule).map(piece => {
        const { profileId: _profileId, ...rule } = migratedCriteria(typedRule(piece));

        return {
            ...rule,
            enabled: stored.isActiveProfile ? rule["enabled"] : false,
        };
    });
}

export const SchemaVersion2Migration = {
    rulesOf(settings: RawRecord): RawRecord[] {
        const activeProfileId = text(settings, "activeProfileId");

        return records(settings, "rules").flatMap(rule => migratedRule({
            rule,
            isActiveProfile: activeProfileId === "" || text(rule, "profileId") === "" || text(rule, "profileId") === activeProfileId,
        }));
    },
};
