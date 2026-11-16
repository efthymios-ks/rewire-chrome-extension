import { describe, expect, test } from 'vitest';
import { UrlRewrite } from './UrlRewrite';

describe('UrlRewrite', () => {
    test('removeQueryParams_WhenPatternsUseWildcards_ShouldDropMatchingKeysOnly', () => {
        // Arrange
        const url = 'https://api.example.com/users?utm_source=mail&page=2&utm_medium=email&fbclid=x';
        const patterns = [
            'utm_*',
            'fbclid',
        ];

        // Act
        const cleaned = UrlRewrite.removeQueryParams(url, patterns);

        // Assert
        expect(cleaned).toBe('https://api.example.com/users?page=2');
    });

    test('addOrReplaceQueryParams_WhenParamsAreGiven_ShouldReplaceExistingOnesAndAddMissingOnes', () => {
        // Arrange
        const url = 'https://api.example.com/users?page=2';
        const params = [
            {
                key: 'page',
                value: '3',
            },
            {
                key: 'lang',
                value: 'en',
            },
        ];

        // Act
        const updated = UrlRewrite.addOrReplaceQueryParams(url, params);

        // Assert
        expect(updated).toBe('https://api.example.com/users?page=3&lang=en');
    });

    test.each([
        [
            'http://api.example.com/users?page=2',
            'https://api.example.com/users?page=2',
        ],
        [
            'http://api.example.com:8080/users',
            'https://api.example.com:8080/users',
        ],
        [
            'https://api.example.com/users',
            'https://api.example.com/users',
        ],
        [
            'ws://api.example.com/socket',
            'ws://api.example.com/socket',
        ],
        [
            'not a url',
            'not a url',
        ],
    ])('upgradeScheme_WhenUrlIs(%s)_ShouldReturn(%s)', (url, expected) => {
        // Arrange
        const input = url;

        // Act
        const upgraded = UrlRewrite.upgradeScheme(input);

        // Assert
        expect(upgraded).toBe(expected);
    });

    test('removeQueryParams_WhenUrlIsInvalid_ShouldReturnItUnchanged', () => {
        // Arrange
        const url = '/relative?utm_source=mail';

        // Act
        const cleaned = UrlRewrite.removeQueryParams(url, ['utm_*']);
        const updated = UrlRewrite.addOrReplaceQueryParams(url, []);

        // Assert
        expect(cleaned).toBe(url);
        expect(updated).toBe(url);
    });
});
