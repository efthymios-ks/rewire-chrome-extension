import { CommonHeaderNames } from "../../../../Contracts/Http/CommonHeaderNames";
import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import { Result } from "../../../Results/Result";
import type { RuleContext } from "../../Context/RuleContext";
import type { DnrCondition } from "../../Criteria/DnrFragment";
import type { ResponseDraft } from "../../Drafts/Drafts";
import type { DnrRuleDraft } from "../DnrRuleDraft";
import { FieldKind, type FieldSpec } from "../FieldSpec";
import { OperationHint, OperationKinds } from "../OperationKinds";
import { type ResponseArguments, RuleTypeBase } from "../RuleTypeBase";
import { type HeaderOperation, HeaderOperations } from "./HeaderOperations";

interface ResponseHeaderAction {
    operations: HeaderOperation[];
}

export class ResponseHeaderRule extends RuleTypeBase<ResponseHeaderAction> {
    readonly id = RuleTypeIds.ResponseHeader;
    readonly category = RuleCategory.Headers;
    readonly label = "Response header";
    readonly description = "Add, update or remove response headers.";
    override readonly handlesResponse = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FieldKind.Operations,
            key: "operations",
            label: "Headers",
            nameLabel: "Header",
            nameSuggestions: CommonHeaderNames,
            hint: `${OperationHint} Values can use {{variables}}.`,
        },
    ];

    protected defaults(): ResponseHeaderAction {
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

    protected read(action: RuleAction): ResponseHeaderAction {
        return {
            operations: HeaderOperations.read(action),
        };
    }

    protected describe(action: ResponseHeaderAction): string {
        return HeaderOperations.describe(action.operations);
    }

    protected override check(action: ResponseHeaderAction): string[] {
        return HeaderOperations.check(action.operations);
    }

    protected override onResponse(args: ResponseArguments<ResponseHeaderAction>): ResponseDraft {
        return {
            ...args.draft,
            headers: HeaderOperations.apply(
                args.draft.headers,
                args.action.operations,
                args.context
            ),
        };
    }

    protected override browserRules(
        action: ResponseHeaderAction,
        condition: DnrCondition,
        context: RuleContext
    ): Result<DnrRuleDraft[]> {
        const responseHeaders = HeaderOperations.toBrowser(
            action.operations,
            context,
            false
        );
        if (responseHeaders.hasErrors) {
            return responseHeaders;
        }

        return Result.ok([
            {
                action: {
                    type: "modifyHeaders",
                    responseHeaders: responseHeaders.value,
                },
                condition,
            },
        ]);
    }
}
