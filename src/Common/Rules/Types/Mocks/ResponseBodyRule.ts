import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import type { ResponseDraft } from '../../Drafts/ResponseDraft';
import type { FieldSpec } from '../FieldSpec';
import { type OnResponseOptions, RuleTypeBase } from '../RuleTypeBase';
import { type BodyEdit, BodyEdits } from './BodyEdits';

export class ResponseBodyRule extends RuleTypeBase<BodyEdit> {
    readonly id = RULE_TYPE_IDS.ResponseBody;
    readonly category = RULE_CATEGORY.MocksAndResponses;
    readonly label = 'Response body';
    readonly description = 'Replace the response body, merge a JSON patch into it, or find and replace in it.';
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

    protected override onResponse(args: OnResponseOptions<BodyEdit>): ResponseDraft {
        const { draft, action, context } = args;
        if (draft.errorReason != null) {
            return draft;
        }

        return {
            ...draft,
            headers: BodyEdits.headersOf(draft.headers, action),
            body: BodyEdits.bodyOf({ body: draft.body, edit: action, context }),
        };
    }
}
