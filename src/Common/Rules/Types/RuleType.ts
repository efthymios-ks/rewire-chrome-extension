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

export interface ApplyRequestOptions {
    draft: RequestDraft;
    action: RuleAction;
    context: RuleContext;
    criteria?: RuleCriteria;
}

export interface ApplyResponseOptions {
    draft: ResponseDraft;
    action: RuleAction;
    context: RuleContext;
    request: RequestDraft;
}

export interface ToDnrOptions {
    action: RuleAction;
    condition: DnrCondition;
    context: RuleContext;
    criteria?: RuleCriteria;
}

export interface RuleType {
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
    readsResponseBody(action: RuleAction): boolean;
    withoutSecrets(action: RuleAction): RuleAction;
    applyRequest(options: ApplyRequestOptions): RequestDraft;
    applyResponse(options: ApplyResponseOptions): ResponseDraft;
    toDnr(options: ToDnrOptions): Result<DnrRuleDraft[]> | null;
}
