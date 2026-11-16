import { describe, expect, test } from 'vitest';
import { Equalities } from './Equalities';

describe('Equalities', () => {
    test('shallowArray_WhenTheItemsAreTheSameReferences_ShouldBeEqual', () => {
        // Arrange
        const item = {
            id: 1,
        };

        // Act
        const isEqual = Equalities.shallowArray([item], [item]);

        // Assert
        expect(isEqual).toBe(true);
    });

    test('shallowArray_WhenAnItemIsADifferentReference_ShouldNotBeEqual', () => {
        // Arrange
        const left = [
            {
                id: 1,
            },
        ];
        const right = [
            {
                id: 1,
            },
        ];

        // Act
        const isEqual = Equalities.shallowArray(left, right);

        // Assert
        expect(isEqual).toBe(false);
    });

    test('shallowArray_WhenTheLengthsDiffer_ShouldNotBeEqual', () => {
        // Arrange
        const left = [1, 2];
        const right = [1, 2, 3];

        // Act
        const isEqual = Equalities.shallowArray(left, right);

        // Assert
        expect(isEqual).toBe(false);
    });

    test('shallowArray_WhenBothHoldNaN_ShouldBeEqual', () => {
        // Arrange
        const left = [Number.NaN];
        const right = [Number.NaN];

        // Act
        const isEqual = Equalities.shallowArray(left, right);

        // Assert
        expect(isEqual).toBe(true);
    });
});
