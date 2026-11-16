import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import type { RequestDraft } from '../../Drafts/RequestDraft';
import type { FieldSpec } from '../FieldSpec';
import { type OnRequestOptions, RuleTypeBase } from '../RuleTypeBase';
import { type BodyEdit, BodyEdits } from './BodyEdits';

export class RequestBodyRule extends RuleTypeBase<BodyEdit> {
    readonly id = RULE_TYPE_IDS.RequestBody;
    readonly category = RULE_CATEGORY.MocksAndResponses;
    readonly label = 'Request body';
    readonly description = 'Replace the request body, merge a JSON patch into it, or find and replace in it.';
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

    protected override onRequest({ draft, action: edit, context }: OnRequestOptions<BodyEdit>): RequestDraft {
        return {
            ...draft,
            headers: BodyEdits.headersOf(draft.headers, edit),
            body: BodyEdits.bodyOf({ body: draft.body, edit, context }),
        };
    }
}
