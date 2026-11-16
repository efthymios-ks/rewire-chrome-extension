import { describe, expect, test } from 'vitest';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';
import { RuleFilters } from './RuleFilters';
import { aRule } from '../../../TestData';

describe('RuleFilters', () => {
    test('apply_WhenTextIsSet_ShouldKeepRulesWhoseNameMatchesWhateverTheirType', () => {
        // Arrange
        const rules = [
            aRule({
                id: 'users',
                name: 'Users mock',
            }),
            aRule({
                id: 'orders',
                name: 'Orders mock',
            }),
            aRule({
                id: 'delay',
                name: 'Users delay',
                type: RULE_TYPE_IDS.Delay,
            }),
        ];

        // Act
        const filtered = RuleFilters.apply(rules, {
            text: ' USERS ',
        });

        // Assert
        expect(filtered.map(rule => rule.id)).toEqual([
            'users',
            'delay',
        ]);
    });

    test('apply_WhenNothingIsSet_ShouldKeepEveryRule', () => {
        // Arrange
        const rules = [
            aRule(),
            aRule({
                id: 'rule-2',
            }),
        ];

        // Act
        const filtered = RuleFilters.apply(rules, {
            text: '',
        });

        // Assert
        expect(filtered).toEqual(rules);
    });
});
