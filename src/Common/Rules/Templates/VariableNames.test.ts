import { describe, expect, test } from 'vitest';
import { VariableNames } from './VariableNames';

describe('VariableNames', () => {
    test.each([
        [
            'userId',
            true,
        ],
        [
            '_private',
            true,
        ],
        [
            'user.id-2',
            true,
        ],
        [
            '2fast',
            false,
        ],
        [
            'has space',
            false,
        ],
        [
            '',
            false,
        ],
    ])('isValid_WhenTheNameIs(%s)_ShouldReturn(%s)', (name, expected) => {
        // Arrange
        const variableName = name;

        // Act
        const isValid = VariableNames.isValid(variableName);

        // Assert
        expect(isValid).toBe(expected);
    });
});
