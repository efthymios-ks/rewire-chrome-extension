import { HTTP_METHODS } from '../../../Contracts/Http/HttpMethods';
import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import type { Criterion } from '../../../Contracts/Rules/Criterion';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import type { Rule } from '../../../Contracts/Rules/Rule';
import type { RuleAction } from '../../../Contracts/Rules/RuleAction';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';
import { CORS_DEFAULTS } from '../../Rules/Types/Headers/CorsDefaults';
import { DomainList } from '../../Urls/DomainList';
import { OPERATION_KINDS } from '../../Rules/Types/OperationKinds';
import { LegacyBaseUrl } from '../Migrations/LegacyBaseUrl';
import type { LegacyCorsSettings } from './LegacyCorsSettings';
import type { LegacyHeaderInjection } from './LegacyHeaderInjection';
import type { LegacyInterceptionRule } from './LegacyInterceptionRule';
import { LEGACY_REDIRECT_KIND } from './LegacyRedirectKind';
import type { LegacyRedirectRule } from './LegacyRedirectRule';
import { LEGACY_RESPONSE_SOURCE } from './LegacyResponseSource';
import type {
    LegacySettings,
} from './LegacySettings';

interface CriterionOptions {
    field: string;
    op: string;
    value: string;
}

function criterion({ field, op, value }: CriterionOptions): Criterion {
    return {
        field,
        op,
        name: '',
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
    },
): Rule {
    const id = source.id ?? '';

    return {
        id: id === '' ? crypto.randomUUID() : id,
        name: source.name,
        enabled: source.enabled,
        type: content.type,
        criteria: {
            match: CRITERIA_MATCHES.All,
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
    if (legacy.responseSource === LEGACY_RESPONSE_SOURCE.Mock) {
        return {
            type: RULE_TYPE_IDS.MockResponse,
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

    if (legacy.statusCodeOverride != null) {
        return {
            type: RULE_TYPE_IDS.MockResponse,
            action: {
                overrideStatus: true,
                status: legacy.statusCodeOverride,
                overrideBody: false,
                contentType: '',
                headers: [],
                body: '',
            },
        };
    }

    return null;
}

function delayOf(legacy: LegacyInterceptionRule): RuleContent | null {
    return legacy.delayInMilliseconds > 0
        ? {
            type: RULE_TYPE_IDS.Delay,
            action: {
                delayMs: legacy.delayInMilliseconds,
            },
        }
        : null;
}

function fromInterception(legacy: LegacyInterceptionRule): Rule[] {
    const methodCriteria = legacy.method === HTTP_METHODS.Any ? [] : [criterion({
        field: CRITERION_FIELD_IDS.Method,
        op: CRITERION_OPERATOR_IDS.OneOf,
        value: legacy.method,
    })];
    const criteria = [
        ...methodCriteria,
        criterion({
            field: CRITERION_FIELD_IDS.Url,
            op: CRITERION_OPERATOR_IDS.Wildcard,
            value: legacy.urlPattern,
        }),
    ];
    const name = `${legacy.method} ${legacy.urlPattern}`;
    const contents = [
        delayOf(legacy),
        interceptionTypeOf(legacy),
    ].filter((content): content is RuleContent => content != null);

    return contents.map((content, index) => ruleOf(
        /* source: */ {
            id: index === contents.length - 1 ? legacy.id : `${legacy.id}-latency`,
            name,
            enabled: legacy.enabled,
        },
        /* content: */ {
            type: content.type,
            criteria,
            action: content.action,
        },
    ));
}

function fromRedirect(legacy: LegacyRedirectRule): Rule {
    const isMirror = legacy.kind === LEGACY_REDIRECT_KIND.Mirror;
    const target = isMirror ? LegacyBaseUrl.mirrorTarget(legacy.target) : legacy.target;
    const regex = isMirror ? LegacyBaseUrl.mirrorRegex(legacy.source) : legacy.source;
    const name = legacy.name ?? '';

    return ruleOf(
        /* source: */ {
            id: legacy.id,
            name: name === '' ? legacy.source : name,
            enabled: legacy.enabled,
        },
        /* content: */ {
            type: RULE_TYPE_IDS.Rewrite,
            criteria: [
                criterion({ field: CRITERION_FIELD_IDS.Url, op: CRITERION_OPERATOR_IDS.Regex, value: regex }),
            ],
            action: {
                target,
            },
        },
    );
}

function fromHeaderInjection(legacy: LegacyHeaderInjection): Rule {
    const domainCriteria = legacy.domains.length === 0 ? [] : [criterion({
        field: CRITERION_FIELD_IDS.Host,
        op: CRITERION_OPERATOR_IDS.Domains,
        value: DomainList.format(legacy.domains),
    })];

    return ruleOf(
        /* source: */ {
            id: legacy.id,
            name: legacy.headerName,
            enabled: legacy.enabled,
        },
        /* content: */ {
            type: RULE_TYPE_IDS.RequestHeader,
            criteria: domainCriteria,
            action: {
                operations: [
                    {
                        op: OPERATION_KINDS.AddOrUpdate,
                        name: legacy.headerName,
                        value: legacy.headerValue,
                    },
                ],
            },
        },
    );
}

function fromCors(legacy: LegacyCorsSettings | undefined): Rule[] {
    if (legacy == null || (!legacy.enabled && legacy.domains.length === 0)) {
        return [];
    }

    return [
        ruleOf(
            /* source: */ {
                id: '',
                name: 'CORS',
                enabled: legacy.enabled,
            },
            /* content: */ {
                type: RULE_TYPE_IDS.Cors,
                criteria: legacy.domains.length === 0 ? [] : [criterion({
                    field: CRITERION_FIELD_IDS.Host,
                    op: CRITERION_OPERATOR_IDS.Domains,
                    value: DomainList.format(legacy.domains),
                })],
                action: {
                    allowedOrigin: legacy.allowedOrigin,
                    allowedMethods: CORS_DEFAULTS.AllowedMethods,
                    allowedHeaders: legacy.allowedHeaders,
                    answerPreflight: true,
                },
            },
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
