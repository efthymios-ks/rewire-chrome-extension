import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import { HeaderSuggestions } from "../../../Http/HeaderSuggestions";
import { Result } from "../../../Results/Result";
import type { RuleContext } from "../../Context/RuleContext";
import type { DnrCondition } from "../../Criteria/DnrFragment";
import type { RequestDraft } from "../../Drafts/Drafts";
import type { DnrRuleDraft } from "../DnrRuleDraft";
import { FieldKind, type FieldSpec } from "../FieldSpec";
import { OperationHint, OperationKinds } from "../OperationKinds";
import { RuleTypeBase } from "../RuleTypeBase";
import { type HeaderOperation, HeaderOperations } from "./HeaderOperations";

interface RequestHeaderAction {
    operations: HeaderOperation[];
}

export class RequestHeaderRule extends RuleTypeBase<RequestHeaderAction> {
    readonly id = RuleTypeIds.RequestHeader;
    readonly category = RuleCategory.Headers;
    readonly label = "Request header";
    readonly description = "Add, update or remove request headers.";
    override readonly handlesRequest = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FieldKind.Operations,
            key: "operations",
            label: "Headers",
            nameLabel: "Header",
            nameSuggestions: HeaderSuggestions.names(),
            valueSuggestionsFor: HeaderSuggestions.valuesFor,
            hint: `${OperationHint} Values can use {{variables}}.`,
        },
    ];

    protected defaults(): RequestHeaderAction {
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

    protected read(action: RuleAction): RequestHeaderAction {
        return {
            operations: HeaderOperations.read(action),
        };
    }

    protected describe(action: RequestHeaderAction): string {
        return HeaderOperations.describe(action.operations);
    }

    override withoutSecrets(action: RuleAction): RuleAction {
        return HeaderOperations.withoutSecrets(action);
    }

    protected override check(action: RequestHeaderAction): string[] {
        return HeaderOperations.check(action.operations);
    }

    protected override onRequest(
        draft: RequestDraft,
        action: RequestHeaderAction,
        context: RuleContext
    ): RequestDraft {
        return {
            ...draft,
            headers: HeaderOperations.apply(
                draft.headers,
                action.operations,
                context
            ),
        };
    }

    protected override browserRules(
        action: RequestHeaderAction,
        condition: DnrCondition,
        context: RuleContext
    ): Result<DnrRuleDraft[]> {
        const requestHeaders = HeaderOperations.toBrowser(
            action.operations,
            context,
            true
        );
        if (requestHeaders.hasErrors) {
            return requestHeaders;
        }

        return Result.ok([
            {
                action: {
                    type: "modifyHeaders",
                    requestHeaders: requestHeaders.value,
                },
                condition,
            },
        ]);
    }
}
