import type { AppliedRule } from "../../../Contracts/Rules/AppliedRule";
import { ScopeAppearances } from "../Rules/RuleScopes";

export const AppliedRuleText = {
    unique(rules: AppliedRule[]): AppliedRule[] {
        return rules.filter((rule, index) => rules.findIndex(candidate => candidate.ruleId === rule.ruleId) === index);
    },

    nameOf(rule: AppliedRule): string {
        return rule.ruleName || rule.note;
    },

    names(rules: AppliedRule[]): string {
        return AppliedRuleText
            .unique(rules)
            .map(rule => AppliedRuleText.nameOf(rule))
            .join(", ");
    },

    describe(rule: AppliedRule): string {
        return `${AppliedRuleText.nameOf(rule)} (${rule.note}, ${ScopeAppearances[rule.engine].label})`;
    },
};
