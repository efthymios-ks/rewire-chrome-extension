import { describe, expect, test } from 'vitest';
import { deepFreeze } from './deepFreeze';

describe('deepFreeze', () => {
    test('deepFreeze_WhenGivenNestedObjectsAndArrays_ShouldFreezeEveryLevel', () => {
        // Arrange
        const value = {
            name: 'Default',
            rules: [
                {
                    id: 'rule-1',
                },
            ],
            nested: {
                list: [1, 2],
            },
        };

        // Act
        const frozen = deepFreeze(value);

        // Assert
        expect(frozen).toBe(value);
        expect(Object.isFrozen(frozen)).toBe(true);
        expect(Object.isFrozen(frozen.rules)).toBe(true);
        expect(Object.isFrozen(frozen.rules[0])).toBe(true);
        expect(Object.isFrozen(frozen.nested)).toBe(true);
        expect(Object.isFrozen(frozen.nested.list)).toBe(true);
    });

    test('deepFreeze_WhenAChildIsAlreadyFrozenShallowly_ShouldStillFreezeItsChildren', () => {
        // Arrange
        const inner = Object.freeze({
            list: ['a'],
        });

        // Act
        deepFreeze({
            inner,
        });

        // Assert
        expect(Object.isFrozen(inner.list)).toBe(true);
    });

    test('deepFreeze_WhenTheValueHasACycle_ShouldFreezeItWithoutLooping', () => {
        // Arrange
        const value: { self?: unknown } = {};
        value.self = value;

        // Act
        const frozen = deepFreeze(value);

        // Assert
        expect(Object.isFrozen(frozen)).toBe(true);
    });

    test.each([
        null,
        undefined,
        42,
        'text',
    ])('deepFreeze_WhenGiven(%s)_ShouldReturnItUnchanged', value => {
        // Act
        const frozen = deepFreeze(value);

        // Assert
        expect(frozen).toBe(value);
    });

    test('deepFreeze_WhenAFrozenValueIsAssigned_ShouldThrow', () => {
        // Arrange
        const frozen = deepFreeze({
            items: ['a'],
        });

        // Act
        const assign = (): void => {
            frozen.items.push('b');
        };

        // Assert
        expect(assign).toThrow(TypeError);
    });
});
