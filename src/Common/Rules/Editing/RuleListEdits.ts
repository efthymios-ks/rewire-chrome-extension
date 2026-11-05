import type { Rule } from "../../../Contracts/Rules/Rule";

const CopySuffix = " copy";

export const RuleListEdits = {
    move(
        rules: Rule[],
        ruleId: string,
        targetIndex: number
    ): Rule[] {
        const moving = rules.find(rule => rule.id === ruleId);
        if (moving === undefined) {
            return rules;
        }

        const remaining = rules.filter(rule => rule.id !== ruleId);
        const boundedIndex = Math.max(0, Math.min(targetIndex, remaining.length));

        return [
            ...remaining.slice(0, boundedIndex),
            moving,
            ...remaining.slice(boundedIndex),
        ];
    },

    insertAfter(
        rules: Rule[],
        rule: Rule,
        afterRuleId: string | null
    ): Rule[] {
        const index = afterRuleId === null ? -1 : rules.findIndex(candidate => candidate.id === afterRuleId);
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
            name: `${rule.name}${CopySuffix}`,
        };
    },

    replace(rules: Rule[], rule: Rule): Rule[] {
        const exists = rules.some(candidate => candidate.id === rule.id);
        if (!exists) {
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

    restore(
        rules: Rule[],
        rule: Rule,
        index: number
    ): Rule[] {
        const boundedIndex = Math.max(0, Math.min(index, rules.length));

        return [
            ...rules.slice(0, boundedIndex),
            rule,
            ...rules.slice(boundedIndex),
        ];
    },
};
