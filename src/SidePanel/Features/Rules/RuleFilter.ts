import type { Rule } from "../../../Contracts/Rules/Rule";

export const AllTypes = "";

export interface RuleFilter {
    text: string;
    typeId: string;
}

export const RuleFilters = {
    apply(rules: Rule[], filter: RuleFilter): Rule[] {
        const needle = filter.text.trim().toLowerCase();

        return rules.filter(rule => (filter.typeId === AllTypes || rule.type === filter.typeId)
            && (needle === "" || rule.name.toLowerCase().includes(needle)));
    },
};
