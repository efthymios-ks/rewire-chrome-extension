import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import { Result } from "../../../Results/Result";
import { RegexText } from "../../../Urls/RegexText";
import type { RuleContext } from "../../Context/RuleContext";
import type { DnrCondition } from "../../Criteria/DnrFragment";
import type { RequestDraft } from "../../Drafts/Drafts";
import { UrlRewrite } from "../../Http/UrlRewrite";
import { ActionReader } from "../ActionReader";
import type { DnrRuleDraft } from "../DnrRuleDraft";
import { FieldKind, type FieldSpec } from "../FieldSpec";
import { OperationHint, OperationKinds } from "../OperationKinds";
import { RuleChecks } from "../RuleChecks";
import { RuleTypeBase } from "../RuleTypeBase";

const WildcardKeyPattern = /[*?]/;

export const QueryParamsMessages = {
    WildcardKeys: "Wildcard keys such as utm_* work on the inspected tab only.",
    KeepsExisting: "Add and Add if missing look at the params that are there, which works on the inspected tab only.",
    OwnUrlPattern: "Removing params brings its own URL pattern, so with another URL condition it works on the inspected tab only.",
} as const;

const InspectedTabKinds = [
    OperationKinds.Add,
    OperationKinds.AddIfMissing,
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

type QueryApplier = (
    url: string,
    operation: QueryOperation,
    value: string
) => string;

const QueryAppliers: Record<string, QueryApplier> = {
    [OperationKinds.Add]: (
        url,
        operation,
        value
    ) => UrlRewrite.appendQueryParam(
        url,
        operation.name,
        value
    ),
    [OperationKinds.AddIfMissing]: (
        url,
        operation,
        value
    ) => UrlRewrite.hasQueryParam(url, operation.name)
        ? url
        : UrlRewrite.appendQueryParam(
            url,
            operation.name,
            value
        ),
    [OperationKinds.AddOrUpdate]: (
        url,
        operation,
        value
    ) => UrlRewrite.addOrReplaceQueryParams(url, [
        {
            key: operation.name,
            value,
            replaceOnly: false,
        },
    ]),
    [OperationKinds.Remove]: (url, operation) => UrlRewrite.removeQueryParams(url, [operation.name]),
};

function ofKind(operations: QueryOperation[], kind: string): QueryOperation[] {
    return operations.filter(operation => operation.op === kind);
}

function keyFilterOf(operations: QueryOperation[]): string {
    const keys = operations
        .map(operation => RegexText.escape(encodeURIComponent(operation.name)))
        .join("|");

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
    readonly id = RuleTypeIds.QueryParams;
    readonly category = RuleCategory.UrlAndRedirects;
    readonly label = "Query params";
    readonly description = "Add, update or remove query string params.";
    override readonly handlesRequest = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FieldKind.Operations,
            key: "operations",
            label: "Params",
            nameLabel: "Param",
            hint: `${OperationHint} Remove takes wildcard keys such as utm_*. Values can use {{variables}}.`,
        },
    ];

    protected defaults(): QueryParamsAction {
        return {
            operations: [
                {
                    op: OperationKinds.AddOrUpdate,
                    name: "",
                    value: "",
                },
            ],
        };
    }

    protected read(action: RuleAction): QueryParamsAction {
        return {
            operations: ActionReader.records(
                action,
                "operations",
                item => ({
                    op: ActionReader.field(
                        item,
                        "op",
                        OperationKinds.AddOrUpdate
                    ),
                    name: ActionReader.field(item, "name").trim(),
                    value: ActionReader.field(item, "value"),
                })
            ),
        };
    }

    protected describe(action: QueryParamsAction): string {
        return action.operations
            .map(operation => `${operation.op} ${operation.name}`)
            .join(", ");
    }

    protected override check(action: QueryParamsAction): string[] {
        if (action.operations.length === 0) {
            return ["Add at least one param."];
        }

        return action.operations.flatMap(operation => RuleChecks.required(operation.name, "Param"));
    }

    protected override onRequest(
        draft: RequestDraft,
        action: QueryParamsAction,
        context: RuleContext
    ): RequestDraft {
        const url = action.operations.reduce(
            (current, operation) => {
                const applier = QueryAppliers[operation.op] ?? QueryAppliers[OperationKinds.AddOrUpdate]!;

                return applier(
                    current,
                    operation,
                    context.render(operation.value)
                );
            },
            draft.url
        );

        return {
            ...draft,
            url,
        };
    }

    protected override browserRules(
        action: QueryParamsAction,
        condition: DnrCondition,
        context: RuleContext
    ): Result<DnrRuleDraft[]> {
        if (action.operations.some(operation => InspectedTabKinds.some(kind => kind === operation.op))) {
            return Result.fail(QueryParamsMessages.KeepsExisting);
        }

        const removals = ofKind(action.operations, OperationKinds.Remove);
        if (removals.some(operation => WildcardKeyPattern.test(operation.name))) {
            return Result.fail(QueryParamsMessages.WildcardKeys);
        }

        const updates = ofKind(action.operations, OperationKinds.AddOrUpdate).map(operation => ({
            key: operation.name,
            value: context.render(operation.value),
            replaceOnly: false,
        }));
        const needsKeyFilter = updates.length === 0;
        if (needsKeyFilter && condition.regexFilter !== undefined) {
            return Result.fail(QueryParamsMessages.OwnUrlPattern);
        }

        return Result.ok([
            {
                action: {
                    type: "redirect",
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
