import type { Rule } from "../../../Contracts/Rules/Rule";
import type { RuleEngine } from "../../../Contracts/Rules/RuleEngine";
import type { DnrRuleDraft } from "../Types/DnrRuleDraft";
import type { IRuleType } from "../Types/IRuleType";

export interface RulePlan {
    rule: Rule;
    type: IRuleType | null;
    engine: RuleEngine;
    errors: string[];
    reason: string;
    browserRules: DnrRuleDraft[];
    isStaticallyActive: boolean;
    delayMs: number;
}
