import { HeaderLookup } from "../../../Common/Http/HeaderLookup";
import { JsonText } from "../../../Common/Json/JsonText";
import type { IRuleType } from "../../../Common/Rules/Types/IRuleType";
import { OperationKinds } from "../../../Common/Rules/Types/OperationKinds";
import { RuleTypeRegistry } from "../../../Common/Rules/Types/RuleTypeRegistry";
import { SafeUrl } from "../../../Common/Urls/SafeUrl";
import { HeaderNames } from "../../../Contracts/Http/HeaderNames";
import { MediaTypeNames } from "../../../Contracts/Http/MediaTypeNames";
import { StatusCodeLimits } from "../../../Contracts/Http/StatusCodePresets";
import { CriteriaMatches, type Criterion, CriterionFieldIds, CriterionOperatorIds } from "../../../Contracts/Rules/Criterion";
import type { Rule } from "../../../Contracts/Rules/Rule";
import { RuleTypeIds } from "../../../Contracts/Rules/RuleTypeIds";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";

const AnySuffix = "*";
const LeadingDot = ".";

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

function urlPatternOf(url: string): string {
    const parsed = SafeUrl.parse(url);

    return parsed === null ? url : `${parsed.origin}${parsed.pathname}${AnySuffix}`;
}

function typeOf(typeId: string): IRuleType {
    return RuleTypeRegistry.get(typeId)!;
}

export const RuleFactory = {
    create(type: IRuleType): Rule {
        return {
            id: crypto.randomUUID(),
            name: type.label,
            enabled: true,
            type: type.id,
            criteria: {
                match: CriteriaMatches.All,
                items: [],
            },
            action: type.defaultAction(),
        };
    },

    mockOf(detail: TimelineEntryDetail): Rule {
        const summary = detail.summary;
        const body = detail.responseBody ?? "";
        const rule = RuleFactory.create(typeOf(RuleTypeIds.MockResponse));

        return {
            ...rule,
            name: `Mock ${summary.method} ${SafeUrl.parse(summary.url)?.pathname ?? summary.path}`,
            criteria: {
                match: CriteriaMatches.All,
                items: [
                    criterion(
                        CriterionFieldIds.Method,
                        CriterionOperatorIds.OneOf,
                        summary.method
                    ),
                    criterion(
                        CriterionFieldIds.Url,
                        CriterionOperatorIds.Wildcard,
                        urlPatternOf(summary.url)
                    ),
                ],
            },
            action: {
                ...rule.action,
                status: summary.statusCode ?? StatusCodeLimits.DefaultMock,
                contentType: HeaderLookup.find(detail.responseHeaders, HeaderNames.ContentType) ?? MediaTypeNames.ApplicationJson,
                body: JsonText.format(body),
            },
        };
    },

    cookieOf(cookie: chrome.cookies.Cookie): Rule {
        const rule = RuleFactory.create(typeOf(RuleTypeIds.RequestCookie));
        const domain = cookie.domain.startsWith(LeadingDot) ? cookie.domain.slice(LeadingDot.length) : cookie.domain;

        return {
            ...rule,
            name: `Cookie ${cookie.name}`,
            criteria: {
                match: CriteriaMatches.All,
                items: [
                    criterion(
                        CriterionFieldIds.Host,
                        CriterionOperatorIds.Domains,
                        domain
                    ),
                ],
            },
            action: {
                ...rule.action,
                op: OperationKinds.AddOrUpdate,
                name: cookie.name,
                value: cookie.value,
            },
        };
    },
};
