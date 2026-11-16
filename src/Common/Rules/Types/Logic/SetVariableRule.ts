import { HEADER_NAMES } from '../../../../Contracts/Http/HeaderNames';
import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import type { RuleCriteria } from '../../../../Contracts/Rules/RuleCriteria';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import { HeaderLookup } from '../../../Http/HeaderLookup';
import { JsonText } from '../../../Json/JsonText';
import { OwnEntry } from '../../../Objects/OwnEntry';
import { JsonPath } from '../../../Paths/JsonPath';
import { XPath } from '../../../Paths/XPath';
import { RegexCache } from '../../../Regex/RegexCache';
import type { Result } from '../../../Results/Result';
import { SafeUrl } from '../../../Urls/SafeUrl';
import type { RuleContext } from '../../Context/RuleContext';
import { CriteriaEvaluator } from '../../Criteria/CriteriaEvaluator';
import { CRITERION_STAGE } from '../../Criteria/CriterionStage';
import type { RequestDraft } from '../../Drafts/RequestDraft';
import type { ResponseDraft } from '../../Drafts/ResponseDraft';
import { VariableNames } from '../../Templates/VariableNames';
import { CookieHeader } from '../../Http/CookieHeader';
import { ActionReader } from '../ActionReader';
import { FIELD_KIND } from '../FieldKind';
import type { FieldSpec } from '../FieldSpec';
import { RuleChecks } from '../RuleChecks';
import { type OnRequestOptions, type OnResponseOptions, RuleTypeBase } from '../RuleTypeBase';
import { VARIABLE_SOURCES } from './VariableSources';

const RESPONSE_SOURCES: string[] = [
    VARIABLE_SOURCES.ResponseHeader,
    VARIABLE_SOURCES.ResponseBodyJson,
    VARIABLE_SOURCES.ResponseBodyXml,
];

const KEYED_SOURCES: string[] = [
    VARIABLE_SOURCES.Query,
    VARIABLE_SOURCES.RequestHeader,
    VARIABLE_SOURCES.RequestCookie,
    VARIABLE_SOURCES.ResponseHeader,
];

type PathValidator = (path: string) => Result<void>;

const PATH_VALIDATORS: Record<string, PathValidator> = {
    [VARIABLE_SOURCES.RequestBodyJson]: JsonPath.validate,
    [VARIABLE_SOURCES.ResponseBodyJson]: JsonPath.validate,
    [VARIABLE_SOURCES.RequestBodyXml]: XPath.validate,
    [VARIABLE_SOURCES.ResponseBodyXml]: XPath.validate,
};

const PATH_LABEL = 'Path';

function isPathBodySource(source: string): boolean {
    return OwnEntry.of(PATH_VALIDATORS, source) != null;
}

interface SetVariableAction {
    variable: string;
    source: string;
    key: string;
    pattern: string;
    path: string;
}

type Reader = (body: string | null, path: string) => string | null;

function sourceOf(action: RuleAction): string {
    return ActionReader.text({ raw: action, key: 'source', fallback: VARIABLE_SOURCES.Url });
}

function readJson(body: string | null, path: string): string | null {
    if (
        body == null
        || body === ''
        || path.trim() === ''
    ) {
        return null;
    }

    const parsed = JsonText.tryParse(body);
    if (parsed.hasErrors) {
        return null;
    }

    const selected = JsonPath.select(parsed.value, path);
    if (selected.hasErrors || selected.value == null) {
        return null;
    }

    return typeof selected.value === 'string' ? selected.value : JsonText.stringify(selected.value);
}

function readXml(body: string | null, path: string): string | null {
    if (
        body == null
        || body === ''
        || path.trim() === ''
    ) {
        return null;
    }

    const selected = XPath.select(body, path);

    return selected.hasErrors ? null : selected.value;
}

const REQUEST_BODY_READERS: Record<string, Reader> = {
    [VARIABLE_SOURCES.RequestBodyJson]: readJson,
    [VARIABLE_SOURCES.RequestBodyXml]: readXml,
};

const RESPONSE_BODY_READERS: Record<string, Reader> = {
    [VARIABLE_SOURCES.ResponseBodyJson]: readJson,
    [VARIABLE_SOURCES.ResponseBodyXml]: readXml,
};

type RequestReader = (draft: RequestDraft, key: string) => string | null;

const REQUEST_READERS: Record<string, RequestReader> = {
    [VARIABLE_SOURCES.Url]: draft => draft.url,
    [VARIABLE_SOURCES.Query]: (draft, key) => SafeUrl.parse(draft.url)?.searchParams.get(key) ?? null,
    [VARIABLE_SOURCES.RequestHeader]: (draft, key) => HeaderLookup.find(draft.headers, key),
    [VARIABLE_SOURCES.RequestCookie]: (draft, key) => CookieHeader.valuesOf(
        /* header: */ HeaderLookup.find(draft.headers, HEADER_NAMES.Cookie),
        /* name: */ key,
    )[0] ?? null,
};

function extractWithRegex(text: string | null, pattern: string): string | null {
    if (text == null || pattern.trim() === '') {
        return text;
    }

    const compiled = RegexCache.compile(pattern);
    if (compiled.hasErrors) {
        return null;
    }

    const match = compiled.value.exec(text);

    return match == null ? null : match[1] ?? match[0];
}

function requestValueOf(draft: RequestDraft, action: SetVariableAction): string | null {
    const reader = OwnEntry.of(REQUEST_READERS, action.source);
    if (reader != null) {
        return extractWithRegex(
            /* text: */ reader(draft, action.key),
            /* pattern: */ action.pattern,
        );
    }

    const bodyReader = OwnEntry.of(REQUEST_BODY_READERS, action.source);

    return bodyReader == null ? null : bodyReader(draft.body, action.path);
}

export interface StoreOptions {
    value: string | null;
    action: SetVariableAction;
    context: RuleContext;
}

export class SetVariableRule extends RuleTypeBase<SetVariableAction> {
    readonly id = RULE_TYPE_IDS.SetVariable;
    readonly category = RULE_CATEGORY.Logic;
    readonly label = 'Set variable';
    readonly description = 'Capture a value from the URL, a header, a cookie or the body, and use it as {{name}} in other rules.';
    override readonly handlesRequest = true;
    override readonly handlesResponse = true;
    override readonly needsResponseBody = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FIELD_KIND.Text,
            key: 'variable',
            label: 'Variable name',
            placeholder: 'userId',
        },
        {
            kind: FIELD_KIND.Select,
            key: 'source',
            label: 'From',
            options: [
                {
                    value: VARIABLE_SOURCES.Url,
                    label: 'URL',
                },
                {
                    value: VARIABLE_SOURCES.Query,
                    label: 'Query parameter',
                },
                {
                    value: VARIABLE_SOURCES.RequestHeader,
                    label: 'Request header',
                },
                {
                    value: VARIABLE_SOURCES.RequestCookie,
                    label: 'Request cookie',
                },
                {
                    value: VARIABLE_SOURCES.ResponseHeader,
                    label: 'Response header',
                },
                {
                    value: VARIABLE_SOURCES.RequestBodyJson,
                    label: 'Request body (JSONPath)',
                },
                {
                    value: VARIABLE_SOURCES.ResponseBodyJson,
                    label: 'Response body (JSONPath)',
                },
                {
                    value: VARIABLE_SOURCES.RequestBodyXml,
                    label: 'Request body (XPath)',
                },
                {
                    value: VARIABLE_SOURCES.ResponseBodyXml,
                    label: 'Response body (XPath)',
                },
            ],
        },
        {
            kind: FIELD_KIND.Text,
            key: 'key',
            label: 'Name',
            placeholder: 'Name',
            visibleWhen: action => KEYED_SOURCES.includes(sourceOf(action)),
        },
        {
            kind: FIELD_KIND.Text,
            key: 'path',
            label: PATH_LABEL,
            placeholder: '$.items[0].id',
            hint: "JSONPath for JSON sources ($.a.b[0], $.items[-1].sku, $.user['first-name']). XPath for XML (/root/elem[1]/@attr, //note/text(), /root/items[@kind='primary']).",
            visibleWhen: action => isPathBodySource(sourceOf(action)),
        },
        {
            kind: FIELD_KIND.Text,
            key: 'pattern',
            label: 'Regex (optional)',
            placeholder: '/users/(\\d+)',
            hint: 'The first group, or the whole match, becomes the value.',
            visibleWhen: action => !isPathBodySource(sourceOf(action)),
        },
    ];

    override runsAtResponse(action: RuleAction, criteria: RuleCriteria): boolean {
        return RESPONSE_SOURCES.includes(sourceOf(action))
            || CriteriaEvaluator.hasStage(criteria, CRITERION_STAGE.Response);
    }

    override readsResponseBody(action: RuleAction): boolean {
        return OwnEntry.of(RESPONSE_BODY_READERS, sourceOf(action)) != null;
    }

    protected defaults(): SetVariableAction {
        return {
            variable: '',
            source: VARIABLE_SOURCES.Url,
            key: '',
            pattern: '',
            path: '',
        };
    }

    protected read(action: RuleAction): SetVariableAction {
        return {
            variable: ActionReader.text({ raw: action, key: 'variable' }).trim(),
            source: sourceOf(action),
            key: ActionReader.text({ raw: action, key: 'key' }).trim(),
            pattern: ActionReader.text({ raw: action, key: 'pattern' }),
            path: ActionReader.text({ raw: action, key: 'path' }).trim(),
        };
    }

    protected describe(action: SetVariableAction): string {
        const detail = KEYED_SOURCES.includes(action.source) ? ` ${action.key}` : '';
        const pathBit = isPathBodySource(action.source) ? ` ${action.path}` : '';

        return `{{${action.variable}}} <- ${action.source}${detail}${pathBit}`;
    }

    protected override check(action: SetVariableAction): string[] {
        return [
            ...(VariableNames.isValid(action.variable) ? [] : [VariableNames.RuleMessage]),
            ...(KEYED_SOURCES.includes(action.source) ? RuleChecks.required(action.key, 'Name') : []),
            ...this.pathErrors(action),
            ...(action.pattern.trim() === '' || isPathBodySource(action.source)
                ? []
                : RuleChecks.regex(action.pattern, 'Regex')),
        ];
    }

    protected override onRequest({
        draft,
        action,
        context,
    }: OnRequestOptions<SetVariableAction>): RequestDraft {
        if (RESPONSE_SOURCES.includes(action.source)) {
            return draft;
        }

        this.store({
            value: requestValueOf(draft, action),
            action,
            context,
        });

        return draft;
    }

    protected override onResponse(args: OnResponseOptions<SetVariableAction>): ResponseDraft {
        if (args.action.source === VARIABLE_SOURCES.ResponseHeader) {
            this.store({
                value: extractWithRegex(
                    /* text: */ HeaderLookup.find(args.draft.headers, args.action.key),
                    /* pattern: */ args.action.pattern,
                ),
                action: args.action,
                context: args.context,
            });

            return args.draft;
        }

        const bodyReader = OwnEntry.of(RESPONSE_BODY_READERS, args.action.source);
        this.store({
            value: bodyReader == null
                ? requestValueOf(args.request, args.action)
                : bodyReader(args.draft.body, args.action.path),
            action: args.action,
            context: args.context,
        });

        return args.draft;
    }

    private pathErrors(action: SetVariableAction): string[] {
        const validate = OwnEntry.of(PATH_VALIDATORS, action.source);
        if (validate == null) {
            return [];
        }

        const required = RuleChecks.required(action.path, PATH_LABEL);
        if (required.length > 0) {
            return required;
        }

        const parsed = validate(action.path);

        return parsed.hasErrors ? [`${PATH_LABEL} is invalid: ${parsed.error}`] : [];
    }

    private store({ value, action, context }: StoreOptions): void {
        if (value == null) {
            return;
        }

        context.setVariable(action.variable, value);
    }
}
