import { describe, expect, test } from 'vitest';
import { CriterionFieldRegistry } from './CriterionFieldRegistry';
import { CRITERION_FIELDS } from './CriterionFields';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';

describe('CriterionFieldRegistry', () => {
    test.each(Object.values(CRITERION_FIELD_IDS))('get_WhenIdIs(%s)_ShouldReturnThatField', id => {
        // Act
        const field = CriterionFieldRegistry.get(id);

        // Assert
        expect(field?.id).toBe(id);
        expect(CRITERION_FIELDS).toContain(field);
    });

    test.each([
        '',
        'URL',
        'device',
        'toString',
        'constructor',
    ])('get_WhenIdIs(%s)_ShouldReturnUndefined', id => {
        // Act
        const field = CriterionFieldRegistry.get(id);

        // Assert
        expect(field).toBeUndefined();
    });
});
