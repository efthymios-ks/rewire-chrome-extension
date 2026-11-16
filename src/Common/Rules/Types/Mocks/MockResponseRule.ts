import { HEADER_NAMES } from '../../../../Contracts/Http/HeaderNames';
import { MEDIA_TYPE_NAMES } from '../../../../Contracts/Http/MediaTypeNames';
import { STATUS_CODE_LIMITS } from '../../../../Contracts/Http/StatusCodeLimits';
import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import type { RuleCriteria } from '../../../../Contracts/Rules/RuleCriteria';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import type { HeaderEntry } from '../../../../Contracts/Timeline/HeaderEntry';
import { HeaderLookup } from '../../../Http/HeaderLookup';
import { HeaderSuggestions } from '../../../Http/HeaderSuggestions';
import { SensitiveHeaders } from '../../../Http/SensitiveHeaders';
import type { RuleContext } from '../../Context/RuleContext';
import { CriteriaEvaluator } from '../../Criteria/CriteriaEvaluator';
import { CRITERION_STAGE } from '../../Criteria/CriterionStage';
import type { RequestDraft } from '../../Drafts/RequestDraft';
import type { ResponseDraft } from '../../Drafts/ResponseDraft';
import { HeaderList } from '../../Http/HeaderList';
import { ActionReader } from '../ActionReader';
import { FIELD_KIND } from '../FieldKind';
import type { FieldSpec } from '../FieldSpec';
import { CorsHeaders } from '../Headers/CorsHeaders';
import { RuleChecks } from '../RuleChecks';
import { type OnRequestOptions, type OnResponseOptions, RuleTypeBase } from '../RuleTypeBase';
import { MOCK_MESSAGES } from './MockMessages';

interface KeyValue {
    key: string;
    value: string;
}

interface MockResponseAction {
    overrideStatus: boolean;
    status: number;
    overrideBody: boolean;
    contentType: string;
    headers: KeyValue[];
    body: string;
}

const MOCK_RESPONSE_KEYS = Object.freeze({
    OverrideStatus: 'overrideStatus',
    OverrideBody: 'overrideBody',
} as const);

function keyValues(action: RuleAction, key: string): KeyValue[] {
    return ActionReader.records({
        raw: action,
        key,
        map: item => ({
            key: ActionReader.text({ raw: item, key: 'key' }).trim(),
            value: ActionReader.text({ raw: item, key: 'value' }),
        }),
    });
}

function isOn(key: string): (action: RuleAction) => boolean {
    return action => action[key] !== false;
}

function isFullMock(action: MockResponseAction): boolean {
    return action.overrideStatus && action.overrideBody;
}

function withHeaders(
    headers: HeaderEntry[],
    additions: HeaderEntry[],
): HeaderEntry[] {
    return additions.reduce(
        /* callbackfn: */ (current, header) => HeaderList.set({
            headers: current,
            name: header.name,
            value: header.value,
        }),
        /* initialValue: */ headers,
    );
}

function customHeaders(action: MockResponseAction, context: RuleContext): HeaderEntry[] {
    return action.headers.map(header => ({
        name: header.key,
        value: context.render(header.value),
    }));
}

function contentTypeHeaders(contentType: string): HeaderEntry[] {
    return contentType.trim() === ''
        ? []
        : [
            {
                name: HEADER_NAMES.ContentType,
                value: contentType.trim(),
            },
        ];
}

export class MockResponseRule extends RuleTypeBase<MockResponseAction> {
    readonly id = RULE_TYPE_IDS.MockResponse;
    readonly category = RULE_CATEGORY.MocksAndResponses;
    readonly label = 'Mock response';
    readonly description = 'Answer with your own status, body or both. With both, the server is never called.';
    override readonly handlesRequest = true;
    override readonly handlesResponse = true;
    override readonly needsResponseBody = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FIELD_KIND.Checkbox,
            key: MOCK_RESPONSE_KEYS.OverrideStatus,
            label: 'Override the status',
        },
        {
            kind: FIELD_KIND.Status,
            key: 'status',
            label: 'Status',
            visibleWhen: isOn(MOCK_RESPONSE_KEYS.OverrideStatus),
        },
        {
            kind: FIELD_KIND.Checkbox,
            key: MOCK_RESPONSE_KEYS.OverrideBody,
            label: 'Override the body',
        },
        {
            kind: FIELD_KIND.MediaType,
            key: 'contentType',
            label: 'Content type',
            placeholder: MEDIA_TYPE_NAMES.ApplicationJson,
            visibleWhen: isOn(MOCK_RESPONSE_KEYS.OverrideBody),
        },
        {
            kind: FIELD_KIND.Code,
            key: 'body',
            label: 'Body',
            rows: 12,
            hint: 'Can use {{variables}}.',
            visibleWhen: isOn(MOCK_RESPONSE_KEYS.OverrideBody),
        },
        {
            kind: FIELD_KIND.KeyValueList,
            key: 'headers',
            label: 'Headers',
            nameSuggestions: HeaderSuggestions.names(),
            valueSuggestionsFor: HeaderSuggestions.valuesFor,
        },
    ];

    override runsAtRequest(action: RuleAction): boolean {
        return isFullMock(this.read(action));
    }

    override runsAtResponse(action: RuleAction, criteria: RuleCriteria): boolean {
        return !isFullMock(this.read(action))
            || CriteriaEvaluator.hasStage(criteria, CRITERION_STAGE.Response);
    }

    protected defaults(): MockResponseAction {
        return {
            overrideStatus: true,
            status: STATUS_CODE_LIMITS.DefaultMock,
            overrideBody: true,
            contentType: MEDIA_TYPE_NAMES.ApplicationJson,
            headers: [],
            body: '{}',
        };
    }

    protected read(action: RuleAction): MockResponseAction {
        return {
            overrideStatus: ActionReader.bool({
                raw: action,
                key: MOCK_RESPONSE_KEYS.OverrideStatus,
                fallback: true,
            }),
            status: ActionReader.number({
                raw: action,
                key: 'status',
                fallback: STATUS_CODE_LIMITS.DefaultMock,
            }),
            overrideBody: ActionReader.bool({
                raw: action,
                key: MOCK_RESPONSE_KEYS.OverrideBody,
                fallback: true,
            }),
            contentType: ActionReader.text({
                raw: action,
                key: 'contentType',
                fallback: MEDIA_TYPE_NAMES.ApplicationJson,
            }),
            headers: keyValues(action, 'headers'),
            body: ActionReader.text({ raw: action, key: 'body' }),
        };
    }

    protected describe(action: MockResponseAction): string {
        const bodyLabel = action.contentType === '' ? 'body' : action.contentType;
        const parts = [
            action.overrideStatus ? String(action.status) : null,
            action.overrideBody ? bodyLabel : null,
        ];

        return parts
            .filter((part): part is string => part != null)
            .join(' ');
    }

    override withoutSecrets(action: RuleAction): RuleAction {
        return {
            ...action,
            headers: keyValues(action, 'headers').map(header => SensitiveHeaders.isSensitive(header.key)
                ? {
                    ...header,
                    value: '',
                }
                : header),
        };
    }

    protected override check(action: MockResponseAction): string[] {
        return [
            ...(action.overrideStatus || action.overrideBody ? [] : [MOCK_MESSAGES.NothingToOverride]),
            ...(action.overrideStatus ? RuleChecks.status(action.status) : []),
            ...action.headers.flatMap(header => RuleChecks.headerName(header.key)),
        ];
    }

    protected override onRequest({
        draft,
        action,
        context,
    }: OnRequestOptions<MockResponseAction>): RequestDraft {
        if (!isFullMock(action)) {
            return draft;
        }

        if (CorsHeaders.isPreflight(draft)) {
            return {
                ...draft,
                response: {
                    status: STATUS_CODE_LIMITS.NoContent,
                    headers: CorsHeaders.forPreflight(draft, null),
                    body: '',
                },
            };
        }

        return {
            ...draft,
            response: {
                status: action.status,
                headers: [
                    ...contentTypeHeaders(action.contentType),
                    ...customHeaders(action, context),
                    ...CorsHeaders.echo(HeaderLookup.find(draft.headers, HEADER_NAMES.Origin)),
                ],
                body: context.render(action.body),
            },
        };
    }

    protected override onResponse(args: OnResponseOptions<MockResponseAction>): ResponseDraft {
        const { draft, action, context } = args;
        if (draft.errorReason != null) {
            return draft;
        }

        const bodyHeaders = action.overrideBody ? contentTypeHeaders(action.contentType) : [];

        return {
            ...draft,
            status: action.overrideStatus ? Math.max(action.status, STATUS_CODE_LIMITS.Min) : draft.status,
            headers: withHeaders(draft.headers, [
                ...bodyHeaders,
                ...customHeaders(action, context),
            ]),
            body: action.overrideBody ? context.render(action.body) : draft.body,
        };
    }
}
