import { describe, expect, test } from 'vitest';
import { StoredRuleRecords } from './StoredRuleRecords';

describe('StoredRuleRecords', () => {
    test('actionOf_WhenTheActionIsARecord_ShouldReturnIt', () => {
        // Arrange
        const rule = {
            action: {
                target: 'https://example.com',
            },
        };

        // Act
        const action = StoredRuleRecords.actionOf(rule);

        // Assert
        expect(action).toBe(rule.action);
    });

    test.each([
        undefined,
        null,
        'text',
        [],
    ])('actionOf_WhenTheActionIs(%j)_ShouldReturnAnEmptyRecord', value => {
        // Act
        const action = StoredRuleRecords.actionOf({
            action: value,
        });

        // Assert
        expect(action).toEqual({});
    });

    test.each([
        undefined,
        42,
        [],
    ])('criteriaOf_WhenTheCriteriaIs(%j)_ShouldReturnAnEmptyRecord', value => {
        // Act
        const criteria = StoredRuleRecords.criteriaOf({
            criteria: value,
        });

        // Assert
        expect(criteria).toEqual({});
    });

    test('withCriterion_WhenTheRuleHasCriteria_ShouldAppendTheCriterionAndKeepTheRest', () => {
        // Arrange
        const rule = {
            id: 'rule-1',
            criteria: {
                match: 'all',
                items: [
                    {
                        field: 'method',
                    },
                    'junk',
                ],
            },
        };

        // Act
        const updated = StoredRuleRecords.withCriterion(
            /* rule: */ rule,
            /* criterion: */ {
                field: 'url',
            },
        );

        // Assert
        expect(updated).toEqual({
            id: 'rule-1',
            criteria: {
                match: 'all',
                items: [
                    {
                        field: 'method',
                    },
                    {
                        field: 'url',
                    },
                ],
            },
        });
    });

    test('withCriterion_WhenTheRuleHasNoCriteria_ShouldStartAList', () => {
        // Act
        const updated = StoredRuleRecords.withCriterion(
            /* rule: */ {
                id: 'rule-1',
            },
            /* criterion: */ {
                field: 'url',
            },
        );

        // Assert
        expect(updated).toEqual({
            id: 'rule-1',
            criteria: {
                items: [
                    {
                        field: 'url',
                    },
                ],
            },
        });
    });
});
