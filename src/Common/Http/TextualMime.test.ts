import { describe, expect, test } from 'vitest';
import { TextualMime } from './TextualMime';

describe('TextualMime', () => {
    test.each([
        [
            'application/json',
            true,
        ],
        [
            'application/problem+json; charset=utf-8',
            true,
        ],
        [
            'TEXT/HTML',
            true,
        ],
        [
            'text/plain',
            true,
        ],
        [
            'application/xml',
            true,
        ],
        [
            'image/svg+xml',
            true,
        ],
        [
            'application/javascript',
            true,
        ],
        [
            'application/graphql',
            true,
        ],
        [
            'application/x-www-form-urlencoded',
            true,
        ],
        [
            'image/png',
            false,
        ],
        [
            'application/octet-stream',
            false,
        ],
        [
            'multipart/form-data',
            false,
        ],
        [
            '',
            false,
        ],
    ])('isTextual_WhenMimeTypeIs(%s)_ShouldReturn(%s)', (mimeType, expected) => {
        // Act
        const isTextual = TextualMime.isTextual(mimeType);

        // Assert
        expect(isTextual).toBe(expected);
    });
});
