import type { Criterion } from '../../../Contracts/Rules/Criterion';
import { HEADER_NAMES } from '../../../Contracts/Http/HeaderNames';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import { HeaderLookup } from '../../Http/HeaderLookup';
import { HeaderSuggestions } from '../../Http/HeaderSuggestions';
import { OwnEntry } from '../../Objects/OwnEntry';
import { DomainList } from '../../Urls/DomainList';
import { QueryPattern } from '../../Urls/QueryPattern';
import { RegexText } from '../../Urls/RegexText';
import { SafeUrl } from '../../Urls/SafeUrl';
import { WildcardPattern } from '../../Urls/WildcardPattern';
import { CookieHeader } from '../Http/CookieHeader';
import { HeaderList } from '../Http/HeaderList';
import { criterionValuesOf } from './criterionValuesOf';
import { CRITERION_STAGE } from './CriterionStage';
import type { DnrFragment } from './DnrFragment';
import type { CriterionField } from './CriterionField';
import { DnrFragments } from './DnrFragments';
import { RESOURCE_TYPE_OPTIONS } from './ResourceTypeOption';
import { ResourceTypes } from './ResourceTypes';

const SCHEME_AND_HOST_PATTERN = '^[a-z][a-z0-9+.-]*://[^/?#]+';
const PORT_AND_BOUNDARY_PATTERN = '(?::\\d+)?(?:[/?#]|$)';
const QUERY_OR_FRAGMENT_TAIL = '(?:[?#].*)?$';
const HOST_CHARACTER = '[^/?#:]';
const PATH_CHARACTER = '[^?#]';
const EXTENSION_PATTERN = /\.([A-Za-z0-9]+)$/;
const LEADING_DOTS_PATTERN = /^\.+/;
const PERCENT_SCALE = 100;
const TIME_DIGITS = 2;

const BROWSER_METHODS = [
    'connect',
    'delete',
    'get',
    'head',
    'options',
    'patch',
    'post',
    'put',
];
const OTHER_METHOD = 'other';

const LIST_MESSAGES = Object.freeze({
    NoDomain: 'Host needs at least one domain.',
    NoMethod: 'Method needs at least one value.',
    NoResourceType: 'Resource type needs at least one value.',
    NoExtension: 'File extension needs at least one value.',
} as const);

const RESOURCE_TYPE_IDS = RESOURCE_TYPE_OPTIONS.map(option => option.id);
const KNOWN_RESOURCE_TYPES_TEXT = [
    RESOURCE_TYPE_IDS.slice(0, -1).join(', '),
    RESOURCE_TYPE_IDS.at(-1),
].join(' or ');

type RegexBuilder = (value: string) => string;

const URL_REGEX_BUILDERS: Record<string, RegexBuilder> = {
    [CRITERION_OPERATOR_IDS.Wildcard]: value => WildcardPattern.toRegexSource(value),
    [CRITERION_OPERATOR_IDS.Regex]: value => value,
};

const PATH_REGEX_BUILDERS: Record<string, RegexBuilder> = {
    [CRITERION_OPERATOR_IDS.Wildcard]: value => {
        const path = WildcardPattern.toRegexFragment(value, PATH_CHARACTER);

        return `${SCHEME_AND_HOST_PATTERN}${path}${QUERY_OR_FRAGMENT_TAIL}`;
    },
};

const HOST_REGEX_BUILDERS: Record<string, RegexBuilder> = {
    [CRITERION_OPERATOR_IDS.Wildcard]: value => `^[a-z][a-z0-9+.-]*://${WildcardPattern.toRegexFragment(
        /* pattern: */ value.toLowerCase(),
        /* anyCharacter: */ HOST_CHARACTER,
    )}${PORT_AND_BOUNDARY_PATTERN}`,
};

interface RegexFromOptions {
    builders: Record<string, RegexBuilder>;
    criterion: Criterion;
    unsupportedReason: string;
}

function regexFrom({ builders, criterion, unsupportedReason }: RegexFromOptions): DnrFragment {
    const builder = OwnEntry.of(builders, criterion.op);
    if (builder == null || criterion.negate) {
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
    return String(value).padStart(TIME_DIGITS, '0');
}

function methodsFor(criterion: Criterion): string[] {
    const methods = criterionValuesOf(criterion.value).map(method => BROWSER_METHODS.includes(method)
        ? method
        : OTHER_METHOD);

    return [...new Set(methods)];
}

function extensionsOf(text: string): string[] {
    return criterionValuesOf(text)
        .map(extension => extension.replace(LEADING_DOTS_PATTERN, ''))
        .filter(extension => extension.length > 0);
}

function errorsWhenEmpty(items: string[], message: string): string[] {
    return items.length === 0 ? [message] : [];
}

function resourceTypeErrors(criterion: Criterion): string[] {
    const ids = criterionValuesOf(criterion.value);
    if (ids.length === 0) {
        return [LIST_MESSAGES.NoResourceType];
    }

    return ids
        .filter(id => !ResourceTypes.isKnown(id))
        .map(id => `Resource type "${id}" is not known. Use ${KNOWN_RESOURCE_TYPES_TEXT}.`);
}

export const CRITERION_FIELDS: CriterionField[] = [
    {
        id: CRITERION_FIELD_IDS.Url,
        label: 'URL',
        stage: CRITERION_STAGE.Request,
        operators: [
            CRITERION_OPERATOR_IDS.Wildcard,
            CRITERION_OPERATOR_IDS.Regex,
        ],
        needsName: false,
        valuePlaceholder: '*/api/v1/users/*',
        isCaseInsensitive: true,
        read: ({ facts }) => [facts.request.url],
        toDnr: criterion => regexFrom({
            builders: URL_REGEX_BUILDERS,
            criterion,
            unsupportedReason: 'A negated URL condition works on the inspected tab only.',
        }),
    },
    {
        id: CRITERION_FIELD_IDS.Host,
        label: 'Host',
        stage: CRITERION_STAGE.Request,
        operators: [
            CRITERION_OPERATOR_IDS.Domains,
            CRITERION_OPERATOR_IDS.Wildcard,
        ],
        needsName: false,
        valuePlaceholder: 'api.example.com',
        isCaseInsensitive: true,
        read: ({ facts }) => {
            const hostname = urlOf(facts.request.url)?.hostname;

            return hostname == null ? [] : [hostname.toLowerCase()];
        },
        toDnr: criterion => {
            if (criterion.op !== CRITERION_OPERATOR_IDS.Domains) {
                return regexFrom({
                    builders: HOST_REGEX_BUILDERS,
                    criterion,
                    unsupportedReason: 'A negated host pattern works on the inspected tab only.',
                });
            }

            const domains = DomainList.parse(criterion.value);
            if (domains.length === 0) {
                return DnrFragments.unsupported(LIST_MESSAGES.NoDomain);
            }

            return DnrFragments.condition(criterion.negate
                ? {
                    excludedRequestDomains: domains,
                }
                : {
                    requestDomains: domains,
                });
        },
        check: criterion => criterion.op === CRITERION_OPERATOR_IDS.Domains
            ? errorsWhenEmpty(DomainList.parse(criterion.value), LIST_MESSAGES.NoDomain)
            : [],
    },
    {
        id: CRITERION_FIELD_IDS.Method,
        label: 'Method',
        stage: CRITERION_STAGE.Request,
        operators: [CRITERION_OPERATOR_IDS.OneOf],
        needsName: false,
        valuePlaceholder: 'GET, POST',
        read: ({ facts }) => [facts.request.method.toUpperCase()],
        toDnr: criterion => {
            const methods = methodsFor(criterion) as `${chrome.declarativeNetRequest.RequestMethod}`[];
            if (methods.length === 0) {
                return DnrFragments.unsupported(LIST_MESSAGES.NoMethod);
            }

            return DnrFragments.condition(criterion.negate
                ? {
                    excludedRequestMethods: methods,
                }
                : {
                    requestMethods: methods,
                });
        },
        check: criterion => errorsWhenEmpty(criterionValuesOf(criterion.value), LIST_MESSAGES.NoMethod),
    },
    {
        id: CRITERION_FIELD_IDS.Path,
        label: 'Path',
        stage: CRITERION_STAGE.Request,
        operators: [
            CRITERION_OPERATOR_IDS.Wildcard,
            CRITERION_OPERATOR_IDS.Regex,
        ],
        needsName: false,
        valuePlaceholder: '/api/v1/users/*',
        isCaseInsensitive: true,
        read: ({ facts }) => {
            const pathname = urlOf(facts.request.url)?.pathname;

            return pathname == null ? [] : [pathname];
        },
        toDnr: criterion => regexFrom({
            builders: PATH_REGEX_BUILDERS,
            criterion,
            unsupportedReason: 'A path regex or a negated path works on the inspected tab only; a URL regex works on every tab.',
        }),
    },
    {
        id: CRITERION_FIELD_IDS.Extension,
        label: 'File extension',
        stage: CRITERION_STAGE.Request,
        operators: [CRITERION_OPERATOR_IDS.OneOf],
        needsName: false,
        valuePlaceholder: 'js, css',
        isCaseInsensitive: true,
        read: ({ facts }) => {
            const extension = EXTENSION_PATTERN.exec(urlOf(facts.request.url)?.pathname ?? '')?.[1];

            return extension == null ? [] : [extension.toLowerCase()];
        },
        toDnr: criterion => {
            if (criterion.negate) {
                return DnrFragments.unsupported('A negated extension works on the inspected tab only.');
            }

            const extensions = extensionsOf(criterion.value);
            if (extensions.length === 0) {
                return DnrFragments.unsupported(LIST_MESSAGES.NoExtension);
            }

            const alternatives = extensions
                .map(extension => RegexText.escape(extension))
                .join('|');

            return DnrFragments.regex(`^[^?#]*\\.(?:${alternatives})${QUERY_OR_FRAGMENT_TAIL}`);
        },
        check: criterion => errorsWhenEmpty(extensionsOf(criterion.value), LIST_MESSAGES.NoExtension),
        expectedOf: criterion => extensionsOf(criterion.value).join(', '),
    },
    {
        id: CRITERION_FIELD_IDS.Query,
        label: 'Query parameter',
        stage: CRITERION_STAGE.Request,
        operators: [
            CRITERION_OPERATOR_IDS.Exists,
            CRITERION_OPERATOR_IDS.Wildcard,
            CRITERION_OPERATOR_IDS.Regex,
        ],
        needsName: true,
        valuePlaceholder: 'value',
        isCaseInsensitive: true,
        read: ({ facts, criterion }) => {
            const params = urlOf(facts.request.url)?.searchParams;
            const name = criterion.name.toLowerCase();

            return params == null
                ? []
                : [...params]
                    .filter(([key]) => key.toLowerCase() === name)
                    .map(([, value]) => value);
        },
        toDnr: criterion => {
            const name = QueryPattern.nameSource(criterion.name);
            if (criterion.negate) {
                return DnrFragments.unsupported('A negated query condition works on the inspected tab only.');
            }

            if (criterion.op === CRITERION_OPERATOR_IDS.Exists) {
                return DnrFragments.regex(`[?&]${name}(?:=|&|#|$)`);
            }

            if (
                criterion.op === CRITERION_OPERATOR_IDS.Wildcard
                && !WildcardPattern.hasWildcards(criterion.value)
            ) {
                const value = QueryPattern.valueSource(WildcardPattern.unescape(criterion.value));

                return DnrFragments.regex(`[?&]${name}=${value}(?:&|#|$)`);
            }

            return DnrFragments.unsupported('A query value with * or ? or a regex works on the inspected tab only.');
        },
    },
    {
        id: CRITERION_FIELD_IDS.RequestHeader,
        label: 'Request header',
        stage: CRITERION_STAGE.Request,
        operators: [
            CRITERION_OPERATOR_IDS.Exists,
            CRITERION_OPERATOR_IDS.Wildcard,
            CRITERION_OPERATOR_IDS.Regex,
        ],
        needsName: true,
        nameSuggestions: HeaderSuggestions.names(),
        valueSuggestionsFor: HeaderSuggestions.valuesFor,
        valuePlaceholder: 'value',
        read: ({ facts, criterion }) => HeaderList.values(facts.request.headers, criterion.name),
        toDnr: inspectedTabOnly('Request header conditions work on the inspected tab only.'),
    },
    {
        id: CRITERION_FIELD_IDS.RequestCookie,
        label: 'Request cookie',
        stage: CRITERION_STAGE.Request,
        operators: [
            CRITERION_OPERATOR_IDS.Exists,
            CRITERION_OPERATOR_IDS.Wildcard,
            CRITERION_OPERATOR_IDS.Regex,
        ],
        needsName: true,
        valuePlaceholder: 'value',
        read: ({ facts, criterion }) => CookieHeader.valuesOf(
            /* header: */ HeaderLookup.find(facts.request.headers, HEADER_NAMES.Cookie),
            /* name: */ criterion.name,
        ),
        toDnr: inspectedTabOnly('Cookie conditions work on the inspected tab only.'),
    },
    {
        id: CRITERION_FIELD_IDS.ResourceType,
        label: 'Resource type',
        stage: CRITERION_STAGE.Request,
        operators: [CRITERION_OPERATOR_IDS.OneOf],
        needsName: false,
        valuePlaceholder: 'fetch, xhr',
        read: ({ facts }) => ResourceTypes.idsOfDebuggerType(facts.request.resourceType),
        toDnr: criterion => {
            const types = ResourceTypes.browserTypesOf(criterionValuesOf(criterion.value));
            if (types.length === 0) {
                const [reason] = resourceTypeErrors(criterion);

                return DnrFragments.unsupported(reason ?? LIST_MESSAGES.NoResourceType);
            }

            return DnrFragments.condition(criterion.negate
                ? {
                    excludedResourceTypes: types,
                }
                : {
                    resourceTypes: types,
                });
        },
        check: resourceTypeErrors,
    },
    {
        id: CRITERION_FIELD_IDS.ResponseStatus,
        label: 'Response status',
        stage: CRITERION_STAGE.Response,
        operators: [CRITERION_OPERATOR_IDS.Range],
        needsName: false,
        valuePlaceholder: '404, 5xx',
        read: ({ facts }) => facts.response == null ? [] : [String(facts.response.status)],
        toDnr: inspectedTabOnly('Response status conditions work on the inspected tab only.'),
    },
    {
        id: CRITERION_FIELD_IDS.ResponseHeader,
        label: 'Response header',
        stage: CRITERION_STAGE.Response,
        operators: [
            CRITERION_OPERATOR_IDS.Exists,
            CRITERION_OPERATOR_IDS.Wildcard,
            CRITERION_OPERATOR_IDS.Regex,
        ],
        needsName: true,
        nameSuggestions: HeaderSuggestions.names(),
        valueSuggestionsFor: HeaderSuggestions.valuesFor,
        valuePlaceholder: 'value',
        read: ({ facts, criterion }) => facts.response == null
            ? []
            : HeaderList.values(facts.response.headers, criterion.name),
        toDnr: inspectedTabOnly('Response header conditions work on the inspected tab only.'),
    },
    {
        id: CRITERION_FIELD_IDS.ContentType,
        label: 'Response content type',
        stage: CRITERION_STAGE.Response,
        operators: [
            CRITERION_OPERATOR_IDS.Wildcard,
            CRITERION_OPERATOR_IDS.Regex,
        ],
        needsName: false,
        valuePlaceholder: '*json*',
        valueSuggestions: HeaderSuggestions.mediaTypes(),
        read: ({ facts }) => {
            const contentType = facts.response == null
                ? null
                : HeaderLookup.find(facts.response.headers, HEADER_NAMES.ContentType);

            return contentType == null ? [] : [contentType.toLowerCase()];
        },
        toDnr: inspectedTabOnly('Content type conditions work on the inspected tab only.'),
    },
    {
        id: CRITERION_FIELD_IDS.Sample,
        label: 'Sample',
        stage: CRITERION_STAGE.Request,
        operators: [CRITERION_OPERATOR_IDS.Percent],
        needsName: false,
        valuePlaceholder: '10',
        read: ({ context, criterion }) => [String(context.sampleRoll(criterion) * PERCENT_SCALE)],
        toDnr: inspectedTabOnly('Sampling works on the inspected tab only.'),
    },
    {
        id: CRITERION_FIELD_IDS.TimeWindow,
        label: 'Time window',
        stage: CRITERION_STAGE.Static,
        operators: [CRITERION_OPERATOR_IDS.Between],
        needsName: false,
        valuePlaceholder: '09:00-17:30',
        read: ({ context }) => {
            const now = context.now();

            return [`${twoDigits(now.getHours())}:${twoDigits(now.getMinutes())}`];
        },
        toDnr: inspectedTabOnly('Time windows are applied when rules sync.'),
    },
];
