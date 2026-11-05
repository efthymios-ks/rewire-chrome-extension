import type { RuleEngine } from "./RuleEngine";

export interface AppliedRule {
    ruleId: string;
    ruleName: string;
    engine: RuleEngine;
    note: string;
}
