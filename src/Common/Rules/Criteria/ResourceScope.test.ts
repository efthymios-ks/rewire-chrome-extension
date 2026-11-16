import { describe, expect, test } from 'vitest';
import { ResourceScope } from './ResourceScope';
import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import type { RuleCriteria } from '../../../Contracts/Rules/RuleCriteria';
import { aCriterion } from '../../../TestData';

function typedCriteria(value: string, isNegated: boolean = false): RuleCriteria {
    return {
        match: CRITERIA_MATCHES.All,
        items: [
            aCriterion(),
            aCriterion({
                field: CRITERION_FIELD_IDS.ResourceType,
                op: CRITERION_OPERATOR_IDS.OneOf,
                value,
                negate: isNegated,
            }),
        ],
    };
}

const UNTYPED_CRITERIA: RuleCriteria = {
    match: CRITERIA_MATCHES.All,
    items: [aCriterion()],
};

describe('ResourceScope', () => {
    test('hasExplicitTypes_WhenRuleNamesResourceTypes_ShouldReturnTrue', () => {
        // Arrange
        const criteria = typedCriteria('script');

        // Act
        const typed = ResourceScope.hasExplicitTypes(criteria);
        const untyped = ResourceScope.hasExplicitTypes(UNTYPED_CRITERIA);

        // Assert
        expect(typed).toBe(true);
        expect(untyped).toBe(false);
    });

    test.each([
        [
            'XHR',
            true,
        ],
        [
            'Fetch',
            true,
        ],
        [
            'Script',
            false,
        ],
        [
            'Document',
            true,
        ],
    ])('allows_WhenRuleNamesNoTypesAndRequestIs(%s)_ShouldReturn(%s)', (debuggerType, expected) => {
        // Arrange
        const criteria = UNTYPED_CRITERIA;

        // Act
        const isAllowed = ResourceScope.allows(criteria, debuggerType);

        // Assert
        expect(isAllowed).toBe(expected);
    });

    test('allows_WhenRuleNamesTypes_ShouldLeaveFilteringToTheCriteria', () => {
        // Arrange
        const criteria = typedCriteria('fetch');

        // Act
        const isAllowed = ResourceScope.allows(criteria, 'Script');

        // Assert
        expect(isAllowed).toBe(true);
    });

    test('debuggerTypesOf_WhenRuleNamesNoTypes_ShouldReturnDefaultScopeCopy', () => {
        // Arrange
        const first = ResourceScope.debuggerTypesOf(UNTYPED_CRITERIA);
        first?.push('Script');

        // Act
        const second = ResourceScope.debuggerTypesOf(UNTYPED_CRITERIA);

        // Assert
        expect(second).toEqual([
            'XHR',
            'Fetch',
            'Document',
        ]);
    });

    test('debuggerTypesOf_WhenMatchAllNamesTypes_ShouldReturnEachTypeOnce', () => {
        // Arrange
        const criteria = typedCriteria('fetch,document,fetch');

        // Act
        const types = ResourceScope.debuggerTypesOf(criteria);

        // Assert
        expect(types).toEqual([
            'Fetch',
            'XHR',
            'Document',
        ]);
    });

    test('debuggerTypesOf_WhenTypeItemIsNegated_ShouldReturnNull', () => {
        // Arrange
        const criteria = typedCriteria('image', true);

        // Act
        const types = ResourceScope.debuggerTypesOf(criteria);

        // Assert
        expect(types).toBeNull();
    });

    test('debuggerTypesOf_WhenMatchIsAny_ShouldReturnNull', () => {
        // Arrange
        const criteria: RuleCriteria = {
            ...typedCriteria('script'),
            match: CRITERIA_MATCHES.Any,
        };

        // Act
        const types = ResourceScope.debuggerTypesOf(criteria);

        // Assert
        expect(types).toBeNull();
    });

    test('debuggerTypesOf_WhenValueUsesCapitalsOrSpaces_ShouldReadItLikeTheCriterionDoes', () => {
        // Arrange
        const criteria = typedCriteria('Fetch XHR');

        // Act
        const types = ResourceScope.debuggerTypesOf(criteria);

        // Assert
        expect(types).toEqual([
            'Fetch',
            'XHR',
        ]);
    });
});
