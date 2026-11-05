import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import type { ResponseDraft } from "../../Drafts/Drafts";
import type { FieldSpec } from "../FieldSpec";
import { type ResponseArguments, RuleTypeBase } from "../RuleTypeBase";
import { type BodyEdit, BodyEdits } from "./BodyEdits";

export class ResponseBodyRule extends RuleTypeBase<BodyEdit> {
    readonly id = RuleTypeIds.ResponseBody;
    readonly category = RuleCategory.MocksAndResponses;
    readonly label = "Response body";
    readonly description = "Replace the response body, merge a JSON patch into it, or find and replace in it.";
    override readonly handlesResponse = true;
    override readonly needsResponseBody = true;
    readonly fields: FieldSpec[] = BodyEdits.fields();

    protected defaults(): BodyEdit {
        return BodyEdits.defaults();
    }

    protected read(action: RuleAction): BodyEdit {
        return BodyEdits.read(action);
    }

    protected describe(edit: BodyEdit): string {
        return BodyEdits.describe(edit);
    }

    protected override check(edit: BodyEdit): string[] {
        return BodyEdits.check(edit);
    }

    protected override onResponse(args: ResponseArguments<BodyEdit>): ResponseDraft {
        const { draft, action, context } = args;
        if (draft.errorReason !== null) {
            return draft;
        }

        return {
            ...draft,
            headers: BodyEdits.headersOf(draft.headers, action),
            body: BodyEdits.bodyOf(
                draft.body,
                action,
                context
            ),
        };
    }
}
