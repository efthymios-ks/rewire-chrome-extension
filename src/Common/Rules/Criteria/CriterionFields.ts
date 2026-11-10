import { type Criterion, CriterionFieldIds, CriterionOperatorIds } from "../../../Contracts/Rules/Criterion";
import { HeaderNames } from "../../../Contracts/Http/HeaderNames";
import { HeaderSuggestions } from "../../Http/HeaderSuggestions";
import { DomainList } from "../../Urls/DomainList";
import { RegexText } from "../../Urls/RegexText";
import { SafeUrl } from "../../Urls/SafeUrl";
import { WildcardPattern } from "../../Urls/WildcardPattern";
import { CookieHeader } from "../Http/CookieHeader";
import { HeaderList } from "../Http/HeaderList";
import { CriterionStage } from "./CriterionStage";
import { type DnrFragment, DnrFragments } from "./DnrFragment";
import type { ICriterionField } from "./ICriterionField";
import { ResourceTypes } from "./ResourceTypes";

const SchemeAndHostPattern = "^[a-z][a-z0-9+.-]*://[^/?#]+";
const PortAndBoundaryPattern = "(?::\\d+)?(?:[/?#]|$)";
const QueryOrFragmentTail = "(?:[?#].*)?$";
const HostCharacter = "[^/?#:]";
const PathCharacter = "[^?#]";
const ListSeparatorPattern = /[\s,]+/;
const ExtensionPattern = /\.([A-Za-z0-9]+)$/;
const PercentScale = 100;
const TimeDigits = 2;

const BrowserMethods = [
    "connect",
    "delete",
    "get",
    "head",
    "options",
    "patch",
    "post",
    "put",
];
const OtherMethod = "other";

type RegexBuilder = (value: string) => string;

const UrlRegexBuilders: Record<string, RegexBuilder> = {
    [CriterionOperatorIds.Wildcard]: value => WildcardPattern.toRegexSource(value),
    [CriterionOperatorIds.Regex]: value => value,
};

const PathRegexBuilders: Record<string, RegexBuilder> = {
    [CriterionOperatorIds.Wildcard]: value => `${SchemeAndHostPattern}${WildcardPattern.toRegexFragment(value, PathCharacter)}${QueryOrFragmentTail}`,
};

const HostRegexBuilders: Record<string, RegexBuilder> = {
    [CriterionOperatorIds.Wildcard]: value => `^[a-z][a-z0-9+.-]*://${WildcardPattern.toRegexFragment(value.toLowerCase(), HostCharacter)}${PortAndBoundaryPattern}`,
};

function listOf(text: string): string[] {
    return text
        .split(ListSeparatorPattern)
        .map(item => item.trim().toLowerCase())
        .filter(item => item.length > 0);
}

function regexFrom(
    builders: Record<string, RegexBuilder>,
    criterion: Criterion,
    unsupportedReason: string
): DnrFragment {
    const builder = builders[criterion.op];
    if (builder === undefined || criterion.negate) {
        return DnrFragments.unsupported(unsupportedReason);
    }

    return DnrFragments.regex(builder(criterion.value));
}

function inspectedTabOnly(reason: string): (criterion: Criterion) => DnrFragment {
    return () => DnrFragments.unsupported(reason);
}

function urlOf(text: string): URL | null {
    return SafeUrl.parse(text);
}

function twoDigits(value: number): string {
    return String(value).padStart(TimeDigits, "0");
}

function methodsFor(criterion: Criterion): string[] {
    const methods = listOf(criterion.value).map(method => BrowserMethods.includes(method) ? method : OtherMethod);

    return [...new Set(methods)];
}

export const CriterionFields: ICriterionField[] = [
    {
        id: CriterionFieldIds.Url,
        label: "URL",
        stage: CriterionStage.Request,
        operators: [
            CriterionOperatorIds.Wildcard,
            CriterionOperatorIds.Regex,
        ],
        needsName: false,
        valuePlaceholder: "*/api/v1/users/*",
        read: facts => [facts.request.url],
        toDnr: criterion => regexFrom(
            UrlRegexBuilders,
            criterion,
            "A negated URL condition works on the inspected tab only."
        ),
    },
    {
        id: CriterionFieldIds.Host,
        label: "Host",
        stage: CriterionStage.Request,
        operators: [
            CriterionOperatorIds.Domains,
            CriterionOperatorIds.Wildcard,
        ],
        needsName: false,
        valuePlaceholder: "api.example.com, auth.example.com",
        read: facts => {
            const hostname = urlOf(facts.request.url)?.hostname;

            return hostname === undefined ? [] : [hostname.toLowerCase()];
        },
        toDnr: criterion => {
            if (criterion.op !== CriterionOperatorIds.Domains) {
                return regexFrom(
                    HostRegexBuilders,
                    criterion,
                    "A negated host pattern works on the inspected tab only."
                );
            }

            const domains = DomainList.parse(criterion.value);

            return DnrFragments.condition(criterion.negate
                ? {
                    excludedRequestDomains: domains,
                }
                : {
                    requestDomains: domains,
                });
        },
    },
    {
        id: CriterionFieldIds.Method,
        label: "Method",
        stage: CriterionStage.Request,
        operators: [CriterionOperatorIds.OneOf],
        needsName: false,
        valuePlaceholder: "GET, POST",
        read: facts => [facts.request.method.toUpperCase()],
        toDnr: criterion => {
            const methods = methodsFor(criterion) as `${chrome.declarativeNetRequest.RequestMethod}`[];

            return DnrFragments.condition(criterion.negate
                ? {
                    excludedRequestMethods: methods,
                }
                : {
                    requestMethods: methods,
                });
        },
    },
    {
        id: CriterionFieldIds.Path,
        label: "Path",
        stage: CriterionStage.Request,
        operators: [
            CriterionOperatorIds.Wildcard,
            CriterionOperatorIds.Regex,
        ],
        needsName: false,
        valuePlaceholder: "/api/v1/users/*",
        read: facts => {
            const pathname = urlOf(facts.request.url)?.pathname;

            return pathname === undefined ? [] : [pathname];
        },
        toDnr: criterion => regexFrom(
            PathRegexBuilders,
            criterion,
            "A path regex or a negated path works on the inspected tab only; a URL regex works on every tab."
        ),
    },
    {
        id: CriterionFieldIds.Extension,
        label: "File extension",
        stage: CriterionStage.Request,
        operators: [CriterionOperatorIds.OneOf],
        needsName: false,
        valuePlaceholder: "js, css, json",
        read: facts => {
            const extension = ExtensionPattern.exec(urlOf(facts.request.url)?.pathname ?? "")?.[1];

            return extension === undefined ? [] : [extension.toLowerCase()];
        },
        toDnr: criterion => {
            if (criterion.negate) {
                return DnrFragments.unsupported("A negated extension works on the inspected tab only.");
            }

            const extensions = listOf(criterion.value)
                .map(extension => RegexText.escape(extension.replace(/^\./, "")))
                .join("|");

            return DnrFragments.regex(`^[^?#]*\\.(?:${extensions})${QueryOrFragmentTail}`);
        },
    },
    {
        id: CriterionFieldIds.Query,
        label: "Query parameter",
        stage: CriterionStage.Request,
        operators: [
            CriterionOperatorIds.Exists,
            CriterionOperatorIds.Wildcard,
            CriterionOperatorIds.Regex,
        ],
        needsName: true,
        valuePlaceholder: "value",
        read: (facts, criterion) => urlOf(facts.request.url)?.searchParams.getAll(criterion.name) ?? [],
        toDnr: criterion => {
            const name = RegexText.escape(encodeURIComponent(criterion.name));
            if (criterion.negate) {
                return DnrFragments.unsupported("A negated query condition works on the inspected tab only.");
            }

            if (criterion.op === CriterionOperatorIds.Exists) {
                return DnrFragments.regex(`[?&]${name}(?:=|&|#|$)`);
            }

            if (criterion.op === CriterionOperatorIds.Wildcard && !WildcardPattern.hasWildcards(criterion.value)) {
                return DnrFragments.regex(`[?&]${name}=${RegexText.escape(encodeURIComponent(WildcardPattern.unescape(criterion.value)))}(?:&|#|$)`);
            }

            return DnrFragments.unsupported("A query value with * or ? or a regex works on the inspected tab only.");
        },
    },
    {
        id: CriterionFieldIds.RequestHeader,
        label: "Request header",
        stage: CriterionStage.Request,
        operators: [
            CriterionOperatorIds.Exists,
            CriterionOperatorIds.Wildcard,
            CriterionOperatorIds.Regex,
        ],
        needsName: true,
        nameSuggestions: HeaderSuggestions.names(),
        valueSuggestionsFor: HeaderSuggestions.valuesFor,
        valuePlaceholder: "value",
        read: (facts, criterion) => HeaderList.values(facts.request.headers, criterion.name),
        toDnr: inspectedTabOnly("Request header conditions work on the inspected tab only."),
    },
    {
        id: CriterionFieldIds.RequestCookie,
        label: "Request cookie",
        stage: CriterionStage.Request,
        operators: [
            CriterionOperatorIds.Exists,
            CriterionOperatorIds.Wildcard,
            CriterionOperatorIds.Regex,
        ],
        needsName: true,
        valuePlaceholder: "value",
        read: (facts, criterion) => CookieHeader.valuesOf(HeaderList.first(facts.request.headers, "Cookie"), criterion.name),
        toDnr: inspectedTabOnly("Cookie conditions work on the inspected tab only."),
    },
    {
        id: CriterionFieldIds.ResourceType,
        label: "Resource type",
        stage: CriterionStage.Request,
        operators: [CriterionOperatorIds.OneOf],
        needsName: false,
        valuePlaceholder: "fetch, xhr",
        read: facts => ResourceTypes.idsOfDebuggerType(facts.request.resourceType),
        toDnr: criterion => {
            const types = ResourceTypes.browserTypesOf(listOf(criterion.value));

            return DnrFragments.condition(criterion.negate
                ? {
                    excludedResourceTypes: types,
                }
                : {
                    resourceTypes: types,
                });
        },
    },
    {
        id: CriterionFieldIds.ResponseStatus,
        label: "Response status",
        stage: CriterionStage.Response,
        operators: [CriterionOperatorIds.Range],
        needsName: false,
        valuePlaceholder: "500-599, 404, 4xx",
        read: facts => facts.response === null ? [] : [String(facts.response.status)],
        toDnr: inspectedTabOnly("Response status conditions work on the inspected tab only."),
    },
    {
        id: CriterionFieldIds.ResponseHeader,
        label: "Response header",
        stage: CriterionStage.Response,
        operators: [
            CriterionOperatorIds.Exists,
            CriterionOperatorIds.Wildcard,
            CriterionOperatorIds.Regex,
        ],
        needsName: true,
        nameSuggestions: HeaderSuggestions.names(),
        valueSuggestionsFor: HeaderSuggestions.valuesFor,
        valuePlaceholder: "value",
        read: (facts, criterion) => facts.response === null ? [] : HeaderList.values(facts.response.headers, criterion.name),
        toDnr: inspectedTabOnly("Response header conditions work on the inspected tab only."),
    },
    {
        id: CriterionFieldIds.ContentType,
        label: "Response content type",
        stage: CriterionStage.Response,
        operators: [
            CriterionOperatorIds.Wildcard,
            CriterionOperatorIds.Regex,
        ],
        needsName: false,
        valuePlaceholder: "*json*",
        valueSuggestions: HeaderSuggestions.mediaTypes(),
        read: facts => {
            const contentType = facts.response === null ? null : HeaderList.first(facts.response.headers, HeaderNames.ContentType);

            return contentType === null ? [] : [contentType.toLowerCase()];
        },
        toDnr: inspectedTabOnly("Content type conditions work on the inspected tab only."),
    },
    {
        id: CriterionFieldIds.Sample,
        label: "Sample",
        stage: CriterionStage.Request,
        operators: [CriterionOperatorIds.Percent],
        needsName: false,
        valuePlaceholder: "10",
        read: (
            _facts,
            _criterion,
            context
        ) => [String(context.random() * PercentScale)],
        toDnr: inspectedTabOnly("Sampling works on the inspected tab only."),
    },
    {
        id: CriterionFieldIds.TimeWindow,
        label: "Time window",
        stage: CriterionStage.Static,
        operators: [CriterionOperatorIds.Between],
        needsName: false,
        valuePlaceholder: "09:00-17:30",
        read: (
            _facts,
            _criterion,
            context
        ) => {
            const now = context.now();

            return [`${twoDigits(now.getHours())}:${twoDigits(now.getMinutes())}`];
        },
        toDnr: inspectedTabOnly("Time windows are applied when rules sync."),
    },
];

export const CriterionFieldRegistry = {
    get(id: string): ICriterionField | undefined {
        return CriterionFields.find(field => field.id === id);
    },
};
