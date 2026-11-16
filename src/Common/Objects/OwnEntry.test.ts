import { describe, expect, test } from 'vitest';
import { OwnEntry } from './OwnEntry';

describe('OwnEntry', () => {
    test('of_WhenTheKeyIsOwn_ShouldReturnItsValue', () => {
        // Arrange
        const table = {
            get: 'Get',
        };

        // Act
        const value = OwnEntry.of(table, 'get');

        // Assert
        expect(value).toBe('Get');
    });

    test.each([
        'toString',
        '__proto__',
        'constructor',
        'hasOwnProperty',
    ])('of_WhenTheKeyIs(%s)FromTheObjectPrototype_ShouldReturnUndefined', key => {
        // Arrange
        const table = {
            get: 'Get',
        };

        // Act
        const value = OwnEntry.of(table, key);

        // Assert
        expect(value).toBeUndefined();
    });
});
