import { describe, expect, test } from 'vitest';
import { RegexText } from './RegexText';

describe('RegexText', () => {
    test.each([
        [
            '',
            '',
        ],
        [
            'plain-text_1',
            'plain-text_1',
        ],
        [
            'api.example.com',
            'api\\.example\\.com',
        ],
        [
            '.*+?^${}()|[]\\',
            '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\',
        ],
        [
            '/users/:id',
            '/users/:id',
        ],
        [
            'café (ü)',
            'café \\(ü\\)',
        ],
    ])('escape_WhenTextIs(%s)_ShouldReturn(%s)', (text, expected) => {
        // Act
        const escaped = RegexText.escape(text);

        // Assert
        expect(escaped).toBe(expected);
    });

    test('escape_WhenUsedInARegex_ShouldMatchTheTextLiterally', () => {
        // Arrange
        const text = 'https://api.example.com/v1/items?q=(a|b)*';

        // Act
        const pattern = new RegExp(`^${RegexText.escape(text)}$`);

        // Assert
        expect(pattern.test(text)).toBe(true);
        expect(pattern.test('https://apiXexample.com/v1/items?q=(a|b)*')).toBe(false);
    });
});
