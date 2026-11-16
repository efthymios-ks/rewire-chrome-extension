import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import type { RuleAction } from '../../../Contracts/Rules/RuleAction';
import type { RuleCategory } from '../../../Contracts/Rules/RuleCategory';
import type { RuleCriteria } from '../../../Contracts/Rules/RuleCriteria';
import type { Result } from '../../Results/Result';
import type { RuleContext } from '../Context/RuleContext';
import type { DnrCondition } from '../Criteria/DnrCondition';
import type { RequestDraft } from '../Drafts/RequestDraft';
import type { ResponseDraft } from '../Drafts/ResponseDraft';
import type { DnrRuleDraft } from './DnrRuleDraft';
import type { FieldSpec } from './FieldSpec';
import type { ApplyRequestOptions, ApplyResponseOptions, RuleType, ToDnrOptions } from './RuleType';

const NO_CRITERIA: RuleCriteria = {
    match: CRITERIA_MATCHES.All,
    items: [],
};

export interface OnRequestOptions<TAction extends object> {
    draft: RequestDraft;
    action: TAction;
    context: RuleContext;
    criteria: RuleCriteria;
}

export interface OnResponseOptions<TAction> {
    draft: ResponseDraft;
    action: TAction;
    context: RuleContext;
    request: RequestDraft;
}

export interface BrowserRulesOptions<TAction extends object> {
    action: TAction;
    condition: DnrCondition;
    context: RuleContext;
    criteria: RuleCriteria;
}

export abstract class RuleTypeBase<TAction extends object> implements RuleType {
    abstract readonly id: string;
    abstract readonly category: RuleCategory;
    abstract readonly label: string;
    abstract readonly description: string;
    abstract readonly fields: FieldSpec[];
    readonly handlesRequest: boolean = false;
    readonly handlesResponse: boolean = false;
    readonly needsResponseBody: boolean = false;
    readonly runsOnBothEngines: boolean = false;

    defaultAction(): RuleAction {
        return {
            ...this.defaults(),
        } as RuleAction;
    }

    validate(action: RuleAction, criteria: RuleCriteria = NO_CRITERIA): string[] {
        return this.check(
            /* action: */ this.read(action),
            /* criteria: */ criteria,
        );
    }

    summary(action: RuleAction): string {
        return this.describe(this.read(action));
    }

    delayOf(_action: RuleAction): number {
        return 0;
    }

    runsAtRequest(_action: RuleAction): boolean {
        return this.handlesRequest;
    }

    runsAtResponse(_action: RuleAction, _criteria: RuleCriteria): boolean {
        return this.handlesResponse;
    }

    readsResponseBody(_action: RuleAction): boolean {
        return this.needsResponseBody;
    }

    withoutSecrets(action: RuleAction): RuleAction {
        return action;
    }

    applyRequest({ draft, action, context, criteria = NO_CRITERIA }: ApplyRequestOptions): RequestDraft {
        return this.onRequest({
            draft,
            action: this.read(action),
            context,
            criteria,
        });
    }

    applyResponse({ draft, action, context, request }: ApplyResponseOptions): ResponseDraft {
        return this.onResponse({
            draft,
            action: this.read(action),
            context,
            request,
        });
    }

    toDnr({
        action,
        condition,
        context,
        criteria = NO_CRITERIA,
    }: ToDnrOptions): Result<DnrRuleDraft[]> | null {
        return this.browserRules({
            action: this.read(action),
            condition,
            context,
            criteria,
        });
    }

    protected abstract defaults(): TAction;

    protected abstract read(action: RuleAction): TAction;

    protected abstract describe(action: TAction): string;

    protected check(_action: TAction, _criteria: RuleCriteria): string[] {
        return [];
    }

    protected onRequest({ draft }: OnRequestOptions<TAction>): RequestDraft {
        return draft;
    }

    protected onResponse(args: OnResponseOptions<TAction>): ResponseDraft {
        return args.draft;
    }

    protected browserRules(_options: BrowserRulesOptions<TAction>): Result<DnrRuleDraft[]> | null {
        return null;
    }
}
