import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import type { RuleContext } from "../../Context/RuleContext";
import type { RequestDraft } from "../../Drafts/Drafts";
import type { FieldSpec } from "../FieldSpec";
import { RuleTypeBase } from "../RuleTypeBase";
import { type BodyEdit, BodyEdits } from "./BodyEdits";

export class RequestBodyRule extends RuleTypeBase<BodyEdit> {
    readonly id = RuleTypeIds.RequestBody;
    readonly category = RuleCategory.MocksAndResponses;
    readonly label = "Request body";
    readonly description = "Replace the request body, merge a JSON patch into it, or find and replace in it.";
    override readonly handlesRequest = true;
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

    protected override onRequest(
        draft: RequestDraft,
        edit: BodyEdit,
        context: RuleContext
    ): RequestDraft {
        return {
            ...draft,
            headers: BodyEdits.headersOf(draft.headers, edit),
            body: BodyEdits.bodyOf(
                draft.body,
                edit,
                context
            ),
        };
    }
}
