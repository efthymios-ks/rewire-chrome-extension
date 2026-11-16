import { describe, expect, test } from 'vitest';
import { SafeUrl } from './SafeUrl';

describe('SafeUrl', () => {
    test.each([
        [
            'https://api.example.com/users?id=1#top',
            'https://api.example.com/users?id=1#top',
        ],
        [
            'http://localhost:3000',
            'http://localhost:3000/',
        ],
        [
            'https://bücher.example/straße',
            'https://xn--bcher-kva.example/stra%C3%9Fe',
        ],
        [
            'data:text/plain,hi',
            'data:text/plain,hi',
        ],
    ])('parse_WhenTextIs(%s)_ShouldReturnTheUrl(%s)', (text, expected) => {
        // Act
        const parsed = SafeUrl.parse(text);

        // Assert
        expect(parsed?.href).toBe(expected);
    });

    test.each([
        '',
        '   ',
        '/relative/path',
        'api.example.com',
        'http://',
        'not a url',
    ])('parse_WhenTextIs(%s)_ShouldReturnNull', text => {
        // Act
        const parsed = SafeUrl.parse(text);

        // Assert
        expect(parsed).toBeNull();
    });
});
