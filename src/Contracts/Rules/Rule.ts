import type { RuleCriteria } from "./Criterion";

export type RuleAction = Record<string, unknown>;

export interface Rule {
    id: string;
    name: string;
    enabled: boolean;
    type: string;
    criteria: RuleCriteria;
    action: RuleAction;
}
