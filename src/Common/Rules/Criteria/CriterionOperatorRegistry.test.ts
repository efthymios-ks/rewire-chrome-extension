import { describe, expect, test } from 'vitest';
import { CriterionOperatorRegistry } from './CriterionOperatorRegistry';
import { CRITERION_OPERATORS } from './CriterionOperators';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';

describe('CriterionOperatorRegistry', () => {
    test.each(Object.values(CRITERION_OPERATOR_IDS))('get_WhenIdIs(%s)_ShouldReturnThatOperator', id => {
        // Act
        const operator = CriterionOperatorRegistry.get(id);

        // Assert
        expect(operator?.id).toBe(id);
        expect(CRITERION_OPERATORS).toContain(operator);
    });

    test.each([
        '',
        'Wildcard',
        'equals',
        'contains',
        'toString',
        '__proto__',
    ])('get_WhenIdIs(%s)_ShouldReturnUndefined', id => {
        // Act
        const operator = CriterionOperatorRegistry.get(id);

        // Assert
        expect(operator).toBeUndefined();
    });
});
