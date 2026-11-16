import type { Rule } from '../../../Contracts/Rules/Rule';

const COPY_SUFFIX = ' copy';

export interface MoveOptions {
    rules: Rule[];
    ruleId: string;
    targetIndex: number;
}

export interface InsertAfterOptions {
    rules: Rule[];
    rule: Rule;
    afterRuleId: string | null;
}

export interface RestoreOptions {
    rules: Rule[];
    rule: Rule;
    index: number;
}

export const RuleListEdits = {
    move({ rules, ruleId, targetIndex }: MoveOptions): Rule[] {
        const moving = rules.find(rule => rule.id === ruleId);
        if (moving == null) {
            return rules;
        }

        const remaining = rules.filter(rule => rule.id !== ruleId);
        const boundedIndex = Math.max(
            /* values: */ 0,
            /* values: */ Math.min(targetIndex, remaining.length),
        );

        return [
            ...remaining.slice(0, boundedIndex),
            moving,
            ...remaining.slice(boundedIndex),
        ];
    },

    insertAfter({ rules, rule, afterRuleId }: InsertAfterOptions): Rule[] {
        const index = afterRuleId == null ? -1 : rules.findIndex(candidate => candidate.id === afterRuleId);
        if (index === -1) {
            return [
                ...rules,
                rule,
            ];
        }

        return [
            ...rules.slice(0, index + 1),
            rule,
            ...rules.slice(index + 1),
        ];
    },

    duplicate(rule: Rule, newId: string): Rule {
        return {
            ...structuredClone(rule),
            id: newId,
            name: `${rule.name}${COPY_SUFFIX}`,
        };
    },

    upsert(rules: Rule[], rule: Rule): Rule[] {
        const isExistingRule = rules.some(candidate => candidate.id === rule.id);
        if (!isExistingRule) {
            return [
                ...rules,
                rule,
            ];
        }

        return rules.map(candidate => candidate.id === rule.id ? rule : candidate);
    },

    remove(rules: Rule[], ruleId: string): Rule[] {
        return rules.filter(rule => rule.id !== ruleId);
    },

    restore({ rules, rule, index }: RestoreOptions): Rule[] {
        const boundedIndex = Math.max(
            /* values: */ 0,
            /* values: */ Math.min(index, rules.length),
        );

        return [
            ...rules.slice(0, boundedIndex),
            rule,
            ...rules.slice(boundedIndex),
        ];
    },
};
