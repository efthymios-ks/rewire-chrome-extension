import { CriteriaMatches, type RuleCriteria } from "../../../Contracts/Rules/Criterion";
import type { RuleAction } from "../../../Contracts/Rules/Rule";
import type { RuleCategory } from "../../../Contracts/Rules/RuleCategory";
import type { Result } from "../../Results/Result";
import type { RuleContext } from "../Context/RuleContext";
import type { DnrCondition } from "../Criteria/DnrFragment";
import type { RequestDraft, ResponseDraft } from "../Drafts/Drafts";
import type { DnrRuleDraft } from "./DnrRuleDraft";
import type { FieldSpec } from "./FieldSpec";
import type { IRuleType } from "./IRuleType";

const NoCriteria: RuleCriteria = {
    match: CriteriaMatches.All,
    items: [],
};

export abstract class RuleTypeBase<TAction extends object> implements IRuleType {
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

    validate(action: RuleAction, criteria: RuleCriteria = NoCriteria): string[] {
        return this.check(this.read(action), criteria);
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

    withoutSecrets(action: RuleAction): RuleAction {
        return action;
    }

    applyRequest(
        draft: RequestDraft,
        action: RuleAction,
        context: RuleContext,
        criteria: RuleCriteria = NoCriteria
    ): RequestDraft {
        return this.onRequest(
            draft,
            this.read(action),
            context,
            criteria
        );
    }

    applyResponse(
        draft: ResponseDraft,
        action: RuleAction,
        context: RuleContext,
        request: RequestDraft
    ): ResponseDraft {
        return this.onResponse({
            draft,
            action: this.read(action),
            context,
            request,
        });
    }

    toDnr(
        action: RuleAction,
        condition: DnrCondition,
        context: RuleContext,
        criteria: RuleCriteria = NoCriteria
    ): Result<DnrRuleDraft[]> | null {
        return this.browserRules(
            this.read(action),
            condition,
            context,
            criteria
        );
    }

    protected abstract defaults(): TAction;

    protected abstract read(action: RuleAction): TAction;

    protected abstract describe(action: TAction): string;

    protected check(_action: TAction, _criteria: RuleCriteria): string[] {
        return [];
    }

    protected onRequest(
        draft: RequestDraft,
        _action: TAction,
        _context: RuleContext,
        _criteria: RuleCriteria
    ): RequestDraft {
        return draft;
    }

    protected onResponse(args: ResponseArguments<TAction>): ResponseDraft {
        return args.draft;
    }

    protected browserRules(
        _action: TAction,
        _condition: DnrCondition,
        _context: RuleContext,
        _criteria: RuleCriteria
    ): Result<DnrRuleDraft[]> | null {
        return null;
    }
}

export interface ResponseArguments<TAction> {
    draft: ResponseDraft;
    action: TAction;
    context: RuleContext;
    request: RequestDraft;
}
