import type { Rule } from '../../../Contracts/Rules/Rule';
import type { RuleFilter } from './RuleFilter';

export const RuleFilters = {
    apply(rules: Rule[], filter: RuleFilter): Rule[] {
        const needle = filter.text.trim().toLowerCase();

        return rules.filter(rule => needle === '' || rule.name.toLowerCase().includes(needle));
    },
};
