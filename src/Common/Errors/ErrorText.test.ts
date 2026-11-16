import { describe, expect, test } from 'vitest';
import { ErrorText } from './ErrorText';

describe('ErrorText', () => {
    test.each([
        [
            new Error('Network down'),
            'Network down',
        ],
        [
            new TypeError('Not a function'),
            'Not a function',
        ],
        [
            new Error(''),
            '',
        ],
        [
            'plain text',
            'plain text',
        ],
        [
            42,
            '42',
        ],
        [
            null,
            'null',
        ],
        [
            undefined,
            'undefined',
        ],
        [
            {
                message: 'not an Error',
            },
            '[object Object]',
        ],
    ])('of_WhenErrorIs(%s)_ShouldReturn(%s)', (error, expected) => {
        // Act
        const text = ErrorText.of(error);

        // Assert
        expect(text).toBe(expected);
    });
});
