import { describe, expect, test } from 'vitest';
import type { AppliedRule } from '../../../Contracts/Rules/AppliedRule';
import { RULE_ENGINE } from '../../../Contracts/Rules/RuleEngine';
import { AppliedRuleText } from './AppliedRuleText';

function anAppliedRule(overrides: Partial<AppliedRule> = {}): AppliedRule {
    return {
        ruleId: 'rule-1',
        ruleName: 'Users mock',
        engine: RULE_ENGINE.Debugger,
        note: 'Mock response',
        ...overrides,
    };
}

describe('AppliedRuleText', () => {
    test('nameOf_WhenTheRuleHasNoName_ShouldUseItsType', () => {
        // Arrange
        const rule = anAppliedRule({
            ruleName: '',
            note: 'Latency',
        });

        // Act
        const name = AppliedRuleText.nameOf(rule);

        // Assert
        expect(name).toBe('Latency');
    });

    test('names_WhenARuleAppliedTwice_ShouldListItOnce', () => {
        // Arrange
        const rules = [
            anAppliedRule(),
            anAppliedRule(),
            anAppliedRule({
                ruleId: 'rule-2',
                ruleName: '',
                note: 'Latency',
            }),
        ];

        // Act
        const names = AppliedRuleText.names(rules);

        // Assert
        expect(names).toBe('Users mock, Latency');
    });

    test('describe_WhenARuleRanInTheBrowser_ShouldSayItRunsOnAllTabs', () => {
        // Arrange
        const rule = anAppliedRule({
            engine: RULE_ENGINE.Browser,
        });

        // Act
        const text = AppliedRuleText.describe(rule);

        // Assert
        expect(text).toBe('Users mock (Mock response, All tabs)');
    });
});
