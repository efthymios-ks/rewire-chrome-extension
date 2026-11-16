import { describe, expect, test } from 'vitest';
import { ByteSize } from './ByteSize';

describe('ByteSize', () => {
    test('ofText_WhenTheTextHasMultiByteCharacters_ShouldCountUtf8Bytes', () => {
        // Arrange
        const text = 'Γειά';

        // Act
        const size = ByteSize.ofText(text);

        // Assert
        expect(size).toBe(8);
    });

    test.each([
        [
            'AAEC',
            3,
        ],
        [
            'AAE=',
            2,
        ],
        [
            'AA==',
            1,
        ],
    ])('ofBase64_WhenTheTextIs(%s)_ShouldCountTheDecodedBytes(%s)', (base64, expected) => {
        // Arrange
        const text = base64;

        // Act
        const size = ByteSize.ofBase64(text);

        // Assert
        expect(size).toBe(expected);
    });
    test.each([
        [
            1,
            '1 byte',
        ],
        [
            0,
            '0 bytes',
        ],
        [
            1234,
            '1,234 bytes',
        ],
    ])('textOf_WhenTheCountIs(%s)_ShouldGroupDigitsAndPickTheNoun', (count, expected) => {
        // Arrange
        const bytes = count;

        // Act
        const text = ByteSize.textOf(bytes);

        // Assert
        expect(text).toBe(expected);
    });
});
