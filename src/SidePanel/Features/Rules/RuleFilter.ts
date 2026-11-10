import type { Rule } from "../../../Contracts/Rules/Rule";

export interface RuleFilter {
    text: string;
}

export const RuleFilters = {
    apply(rules: Rule[], filter: RuleFilter): Rule[] {
        const needle = filter.text.trim().toLowerCase();

        return rules.filter(rule => needle === "" || rule.name.toLowerCase().includes(needle));
    },
};
