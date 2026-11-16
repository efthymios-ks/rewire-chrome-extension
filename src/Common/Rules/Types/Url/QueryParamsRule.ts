import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import { OwnEntry } from '../../../Objects/OwnEntry';
import { Result } from '../../../Results/Result';
import { QueryPattern } from '../../../Urls/QueryPattern';
import type { RequestDraft } from '../../Drafts/RequestDraft';
import { UrlRewrite } from '../../Http/UrlRewrite';
import { ActionReader } from '../ActionReader';
import type { DnrRuleDraft } from '../DnrRuleDraft';
import { FIELD_KIND } from '../FieldKind';
import type { FieldSpec } from '../FieldSpec';
import { OPERATION_HINT } from '../OperationHint';
import { OPERATION_KINDS } from '../OperationKinds';
import { RuleChecks } from '../RuleChecks';
import { type BrowserRulesOptions, type OnRequestOptions, RuleTypeBase } from '../RuleTypeBase';
import { QUERY_PARAMS_MESSAGES } from './QueryParamsMessages';

const WILDCARD_KEY_PATTERN = /[*?]/;

const INSPECTED_TAB_KINDS = [
    OPERATION_KINDS.Add,
    OPERATION_KINDS.AddIfMissing,
];

interface QueryOperation {
    op: string;
    name: string;
    value: string;
}

interface QueryParamsAction {
    operations: QueryOperation[];
}

type QueryTransform = chrome.declarativeNetRequest.QueryTransform;
type QueryKeyValue = chrome.declarativeNetRequest.QueryKeyValue;

interface QueryApplierOptions {
    url: string;
    operation: QueryOperation;
    value: string;
}

type QueryApplier = (options: QueryApplierOptions) => string;

const QUERY_APPLIERS: Record<string, QueryApplier> = {
    [OPERATION_KINDS.Add]: ({ url, operation, value }) => UrlRewrite.appendQueryParam({
        url,
        key: operation.name,
        value,
    }),
    [OPERATION_KINDS.AddIfMissing]: ({
        url,
        operation,
        value,
    }) => UrlRewrite.hasQueryParam(url, operation.name)
        ? url
        : UrlRewrite.appendQueryParam({ url, key: operation.name, value }),
    [OPERATION_KINDS.AddOrUpdate]: ({ url, operation, value }) => UrlRewrite.addOrReplaceQueryParams(url, [
        {
            key: operation.name,
            value,
        },
    ]),
    [OPERATION_KINDS.Remove]: ({ url, operation }) => UrlRewrite.removeQueryParams(url, [operation.name]),
};

function ofKind(operations: QueryOperation[], kind: string): QueryOperation[] {
    return operations.filter(operation => operation.op === kind);
}

function keyFilterOf(operations: QueryOperation[]): string {
    const keys = operations
        .map(operation => QueryPattern.nameSource(operation.name))
        .join('|');

    return `[?&](?:${keys})(?:=|&|#|$)`;
}

function queryTransformOf(removals: QueryOperation[], updates: QueryKeyValue[]): QueryTransform {
    const transform: QueryTransform = {};
    if (removals.length > 0) {
        transform.removeParams = removals.map(operation => operation.name);
    }

    if (updates.length > 0) {
        transform.addOrReplaceParams = updates;
    }

    return transform;
}

export class QueryParamsRule extends RuleTypeBase<QueryParamsAction> {
    readonly id = RULE_TYPE_IDS.QueryParams;
    readonly category = RULE_CATEGORY.UrlAndRedirects;
    readonly label = 'Query params';
    readonly description = 'Add, update or remove query string params.';
    override readonly handlesRequest = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FIELD_KIND.Operations,
            key: 'operations',
            label: 'Params',
            nameLabel: 'Param',
            hint: `${OPERATION_HINT} Remove takes wildcard keys such as utm_*. Values can use {{variables}}.`,
        },
    ];

    protected defaults(): QueryParamsAction {
        return {
            operations: [
                {
                    op: OPERATION_KINDS.AddOrUpdate,
                    name: '',
                    value: '',
                },
            ],
        };
    }

    protected read(action: RuleAction): QueryParamsAction {
        return {
            operations: ActionReader.records({
                raw: action,
                key: 'operations',
                map: item => ({
                    op: ActionReader.text({ raw: item, key: 'op', fallback: OPERATION_KINDS.AddOrUpdate }),
                    name: ActionReader.text({ raw: item, key: 'name' }).trim(),
                    value: ActionReader.text({ raw: item, key: 'value' }),
                }),
            }),
        };
    }

    protected describe(action: QueryParamsAction): string {
        return action.operations
            .map(operation => `${operation.op} ${operation.name}`)
            .join(', ');
    }

    protected override check(action: QueryParamsAction): string[] {
        if (action.operations.length === 0) {
            return ['Add at least one param.'];
        }

        return action.operations.flatMap(operation => RuleChecks.required(operation.name, 'Param'));
    }

    protected override onRequest({
        draft,
        action,
        context,
    }: OnRequestOptions<QueryParamsAction>): RequestDraft {
        const url = action.operations.reduce(
            /* callbackfn: */ (current, operation) => {
                const applier = OwnEntry.of(QUERY_APPLIERS, operation.op)
                    ?? QUERY_APPLIERS[OPERATION_KINDS.AddOrUpdate]!;

                return applier({
                    url: current,
                    operation,
                    value: context.render(operation.value),
                });
            },
            /* initialValue: */ draft.url,
        );

        return {
            ...draft,
            url,
        };
    }

    protected override browserRules({
        action,
        condition,
        context,
    }: BrowserRulesOptions<QueryParamsAction>): Result<DnrRuleDraft[]> {
        if (action.operations.some(operation => INSPECTED_TAB_KINDS.some(kind => kind === operation.op))) {
            return Result.fail(QUERY_PARAMS_MESSAGES.KeepsExisting);
        }

        const removals = ofKind(action.operations, OPERATION_KINDS.Remove);
        if (removals.some(operation => WILDCARD_KEY_PATTERN.test(operation.name))) {
            return Result.fail(QUERY_PARAMS_MESSAGES.WildcardKeys);
        }

        const updates = ofKind(action.operations, OPERATION_KINDS.AddOrUpdate).map(operation => ({
            key: operation.name,
            value: context.render(operation.value),
            replaceOnly: false,
        }));
        const needsKeyFilter = updates.length === 0;
        if (needsKeyFilter && condition.regexFilter != null) {
            return Result.fail(QUERY_PARAMS_MESSAGES.OwnUrlPattern);
        }

        return Result.ok([
            {
                action: {
                    type: 'redirect',
                    redirect: {
                        transform: {
                            queryTransform: queryTransformOf(removals, updates),
                        },
                    },
                },
                condition: needsKeyFilter
                    ? {
                        ...condition,
                        regexFilter: keyFilterOf(removals),
                    }
                    : condition,
            },
        ]);
    }
}
