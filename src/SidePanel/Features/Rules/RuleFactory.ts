import { HeaderLookup } from '../../../Common/Http/HeaderLookup';
import { JsonText } from '../../../Common/Json/JsonText';
import type { RuleType } from '../../../Common/Rules/Types/RuleType';
import { OPERATION_KINDS } from '../../../Common/Rules/Types/OperationKinds';
import { RuleTypeRegistry } from '../../../Common/Rules/Types/RuleTypeRegistry';
import { SafeUrl } from '../../../Common/Urls/SafeUrl';
import { HEADER_NAMES } from '../../../Contracts/Http/HeaderNames';
import { MEDIA_TYPE_NAMES } from '../../../Contracts/Http/MediaTypeNames';
import { STATUS_CODE_LIMITS } from '../../../Contracts/Http/StatusCodeLimits';
import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import type { Criterion } from '../../../Contracts/Rules/Criterion';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import type { Rule } from '../../../Contracts/Rules/Rule';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';

const ANY_SUFFIX = '*';
const LEADING_DOT = '.';

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

function urlPatternOf(url: string): string {
    const parsed = SafeUrl.parse(url);

    return parsed == null ? url : `${parsed.origin}${parsed.pathname}${ANY_SUFFIX}`;
}

function typeOf(typeId: string): RuleType {
    return RuleTypeRegistry.get(typeId)!;
}

export const RuleFactory = {
    create(type: RuleType): Rule {
        return {
            id: crypto.randomUUID(),
            name: type.label,
            enabled: true,
            type: type.id,
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [],
            },
            action: type.defaultAction(),
        };
    },

    mockOf(detail: TimelineEntryDetail): Rule {
        const summary = detail.summary;
        const body = detail.responseBody ?? '';
        const rule = RuleFactory.create(typeOf(RULE_TYPE_IDS.MockResponse));

        return {
            ...rule,
            name: `Mock ${summary.method} ${SafeUrl.parse(summary.url)?.pathname ?? summary.path}`,
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    criterion({
                        field: CRITERION_FIELD_IDS.Method,
                        op: CRITERION_OPERATOR_IDS.OneOf,
                        value: summary.method,
                    }),
                    criterion({
                        field: CRITERION_FIELD_IDS.Url,
                        op: CRITERION_OPERATOR_IDS.Wildcard,
                        value: urlPatternOf(summary.url),
                    }),
                ],
            },
            action: {
                ...rule.action,
                status: summary.statusCode ?? STATUS_CODE_LIMITS.DefaultMock,
                contentType: HeaderLookup.find(detail.responseHeaders, HEADER_NAMES.ContentType)
                    ?? MEDIA_TYPE_NAMES.ApplicationJson,
                body: JsonText.format(body),
            },
        };
    },

    cookieOf(cookie: chrome.cookies.Cookie): Rule {
        const rule = RuleFactory.create(typeOf(RULE_TYPE_IDS.RequestCookie));
        const domain = cookie.domain.startsWith(LEADING_DOT)
            ? cookie.domain.slice(LEADING_DOT.length)
            : cookie.domain;

        return {
            ...rule,
            name: `Cookie ${cookie.name}`,
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    criterion({
                        field: CRITERION_FIELD_IDS.Host,
                        op: CRITERION_OPERATOR_IDS.Domains,
                        value: domain,
                    }),
                ],
            },
            action: {
                ...rule.action,
                op: OPERATION_KINDS.AddOrUpdate,
                name: cookie.name,
                value: cookie.value,
            },
        };
    },
};
