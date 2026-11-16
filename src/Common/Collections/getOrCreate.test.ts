import { describe, expect, test, vi } from 'vitest';
import { getOrCreate } from './getOrCreate';

describe('getOrCreate', () => {
    test('getOrCreate_WhenTheKeyIsMissing_ShouldCreateStoreAndReturnTheValue', () => {
        // Arrange
        const map = new Map<number, string[]>();

        // Act
        const value = getOrCreate({
            map,
            key: 7,
            create: () => ['first'],
        });

        // Assert
        expect(value).toEqual(['first']);
        expect(map.get(7)).toBe(value);
    });

    test('getOrCreate_WhenTheKeyExists_ShouldReturnTheStoredValueWithoutCreating', () => {
        // Arrange
        const stored = ['kept'];
        const map = new Map<number, string[]>([[7, stored]]);
        const create = vi.fn(() => ['new']);

        // Act
        const value = getOrCreate({
            map,
            key: 7,
            create,
        });

        // Assert
        expect(value).toBe(stored);
        expect(create).not.toHaveBeenCalled();
    });
});
