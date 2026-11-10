import { HttpMethods } from "../../../Contracts/Http/HttpMethods";
import { type Criterion, CriteriaMatches, CriterionFieldIds, CriterionOperatorIds } from "../../../Contracts/Rules/Criterion";
import type { Rule, RuleAction } from "../../../Contracts/Rules/Rule";
import { RuleTypeIds } from "../../../Contracts/Rules/RuleTypeIds";
import { DomainList } from "../../Urls/DomainList";
import { RegexText } from "../../Urls/RegexText";
import { CorsDefaults } from "../../Rules/Types/Headers/CorsHeaders";
import { OperationKinds } from "../../Rules/Types/OperationKinds";
import {
    type LegacyCorsSettings,
    type LegacyHeaderInjection,
    type LegacyInterceptionRule,
    type LegacyRedirectRule,
    LegacyRedirectKind,
    LegacyResponseSource,
    type LegacySettings,
} from "./LegacySettings";

const TrailingSlashesPattern = /\/+$/;

function criterion(
    field: string,
    op: string,
    value: string
): Criterion {
    return {
        field,
        op,
        name: "",
        value,
        negate: false,
    };
}

function ruleOf(
    source: {
        id: string;
        name: string;
        enabled: boolean;
    },
    content: {
        type: string;
        criteria: Criterion[];
        action: RuleAction;
    }
): Rule {
    return {
        id: source.id || crypto.randomUUID(),
        name: source.name,
        enabled: source.enabled,
        type: content.type,
        criteria: {
            match: CriteriaMatches.All,
            items: content.criteria,
        },
        action: content.action,
    };
}

interface RuleContent {
    type: string;
    action: RuleAction;
}

function interceptionTypeOf(legacy: LegacyInterceptionRule): RuleContent | null {
    if (legacy.responseSource === LegacyResponseSource.Mock) {
        return {
            type: RuleTypeIds.MockResponse,
            action: {
                overrideStatus: true,
                status: legacy.statusCodeOverride ?? 200,
                overrideBody: true,
                contentType: legacy.mockContentType,
                headers: [],
                body: legacy.mockBody,
            },
        };
    }

    if (legacy.statusCodeOverride !== null) {
        return {
            type: RuleTypeIds.MockResponse,
            action: {
                overrideStatus: true,
                status: legacy.statusCodeOverride,
                overrideBody: false,
                contentType: "",
                headers: [],
                body: "",
            },
        };
    }

    return null;
}

function delayOf(legacy: LegacyInterceptionRule): RuleContent | null {
    return legacy.delayInMilliseconds > 0
        ? {
            type: RuleTypeIds.Delay,
            action: {
                delayMs: legacy.delayInMilliseconds,
            },
        }
        : null;
}

function fromInterception(legacy: LegacyInterceptionRule): Rule[] {
    const methodCriteria = legacy.method === HttpMethods.Any ? [] : [criterion(
        CriterionFieldIds.Method,
        CriterionOperatorIds.OneOf,
        legacy.method
    )];
    const criteria = [
        ...methodCriteria,
        criterion(
            CriterionFieldIds.Url,
            CriterionOperatorIds.Wildcard,
            legacy.urlPattern
        ),
    ];
    const name = `${legacy.method} ${legacy.urlPattern}`;
    const contents = [
        delayOf(legacy),
        interceptionTypeOf(legacy),
    ].filter((content): content is RuleContent => content !== null);

    return contents.map((content, index) => ruleOf(
        {
            id: index === contents.length - 1 ? legacy.id : `${legacy.id}-latency`,
            name,
            enabled: legacy.enabled,
        },
        {
            type: content.type,
            criteria,
            action: content.action,
        }
    ));
}

function fromRedirect(legacy: LegacyRedirectRule): Rule {
    const isMirror = legacy.kind === LegacyRedirectKind.Mirror;
    const source = legacy.source.trim().replace(TrailingSlashesPattern, "");
    const target = isMirror ? `${legacy.target.trim().replace(TrailingSlashesPattern, "")}$1` : legacy.target;
    const regex = isMirror ? `^${RegexText.escape(source)}((?:[/?#].*)?)$` : legacy.source;

    return ruleOf(
        {
            id: legacy.id,
            name: legacy.name || legacy.source,
            enabled: legacy.enabled,
        },
        {
            type: RuleTypeIds.Rewrite,
            criteria: [
                criterion(
                    CriterionFieldIds.Url,
                    CriterionOperatorIds.Regex,
                    regex
                ),
            ],
            action: {
                target,
            },
        }
    );
}

function fromHeaderInjection(legacy: LegacyHeaderInjection): Rule {
    const domainCriteria = legacy.domains.length === 0 ? [] : [criterion(
        CriterionFieldIds.Host,
        CriterionOperatorIds.Domains,
        DomainList.format(legacy.domains)
    )];

    return ruleOf(
        {
            id: legacy.id,
            name: legacy.headerName,
            enabled: legacy.enabled,
        },
        {
            type: RuleTypeIds.RequestHeader,
            criteria: domainCriteria,
            action: {
                operations: [
                    {
                        op: OperationKinds.AddOrUpdate,
                        name: legacy.headerName,
                        value: legacy.headerValue,
                    },
                ],
            },
        }
    );
}

function fromCors(legacy: LegacyCorsSettings | undefined): Rule[] {
    if (legacy === undefined || (!legacy.enabled && legacy.domains.length === 0)) {
        return [];
    }

    return [
        ruleOf(
            {
                id: "",
                name: "CORS",
                enabled: legacy.enabled,
            },
            {
                type: RuleTypeIds.Cors,
                criteria: legacy.domains.length === 0 ? [] : [criterion(
                    CriterionFieldIds.Host,
                    CriterionOperatorIds.Domains,
                    DomainList.format(legacy.domains)
                )],
                action: {
                    allowedOrigin: legacy.allowedOrigin,
                    allowedMethods: CorsDefaults.AllowedMethods,
                    allowedHeaders: legacy.allowedHeaders,
                    answerPreflight: true,
                },
            }
        ),
    ];
}

export const LegacySettingsMigration = {
    hasLegacyRules(stored: LegacySettings): boolean {
        return stored.interceptionRules !== undefined
            || stored.redirectRules !== undefined
            || stored.headerInjections !== undefined
            || stored.cors !== undefined;
    },

    toRules(stored: LegacySettings): Rule[] {
        return [
            ...(stored.interceptionRules ?? []).flatMap(fromInterception),
            ...(stored.redirectRules ?? []).map(fromRedirect),
            ...(stored.headerInjections ?? []).map(fromHeaderInjection),
            ...fromCors(stored.cors),
        ];
    },
};
