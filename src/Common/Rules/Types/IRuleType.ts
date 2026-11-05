import type { RuleCriteria } from "../../../Contracts/Rules/Criterion";
import type { RuleAction } from "../../../Contracts/Rules/Rule";
import type { RuleCategory } from "../../../Contracts/Rules/RuleCategory";
import type { Result } from "../../Results/Result";
import type { RuleContext } from "../Context/RuleContext";
import type { DnrCondition } from "../Criteria/DnrFragment";
import type { RequestDraft, ResponseDraft } from "../Drafts/Drafts";
import type { DnrRuleDraft } from "./DnrRuleDraft";
import type { FieldSpec } from "./FieldSpec";

export interface IRuleType {
    readonly id: string;
    readonly category: RuleCategory;
    readonly label: string;
    readonly description: string;
    readonly fields: FieldSpec[];
    readonly handlesRequest: boolean;
    readonly handlesResponse: boolean;
    readonly needsResponseBody: boolean;
    readonly runsOnBothEngines: boolean;
    defaultAction(): RuleAction;
    validate(action: RuleAction, criteria?: RuleCriteria): string[];
    summary(action: RuleAction): string;
    delayOf(action: RuleAction): number;
    runsAtRequest(action: RuleAction): boolean;
    runsAtResponse(action: RuleAction, criteria: RuleCriteria): boolean;
    withoutSecrets(action: RuleAction): RuleAction;
    applyRequest(
        draft: RequestDraft,
        action: RuleAction,
        context: RuleContext,
        criteria?: RuleCriteria
    ): RequestDraft;
    applyResponse(
        draft: ResponseDraft,
        action: RuleAction,
        context: RuleContext,
        request: RequestDraft
    ): ResponseDraft;
    toDnr(
        action: RuleAction,
        condition: DnrCondition,
        context: RuleContext,
        criteria?: RuleCriteria
    ): Result<DnrRuleDraft[]> | null;
}
