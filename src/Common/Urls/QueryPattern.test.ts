import { describe, expect, test } from 'vitest';
import { QueryPattern } from './QueryPattern';

function anchored(source: string): RegExp {
    return new RegExp(`^${source}$`, 'i');
}

describe('QueryPattern', () => {
    test.each([
        [
            '/home',
            [
                '/home',
                '%2Fhome',
            ],
        ],
        [
            'a:b',
            [
                'a:b',
                'a%3Ab',
            ],
        ],
        [
            'a b',
            [
                'a%20b',
                'a+b',
            ],
        ],
        [
            'a#b',
            ['a%23b'],
        ],
        [
            'café',
            [
                'caf%C3%A9',
                'caf%c3%a9',
            ],
        ],
        [
            '100%',
            [
                '100%',
                '100%25',
            ],
        ],
    ])('valueSource_WhenValueIs(%s)_ShouldMatchEveryBrowserEncoding(%s)', (value, encodings) => {
        // Arrange
        const regex = anchored(QueryPattern.valueSource(value));

        // Act
        const matches = encodings.map(encoded => regex.test(encoded));

        // Assert
        expect(matches.every(Boolean)).toBe(true);
    });

    test.each([
        [
            'a+b',
            'a+b',
        ],
        [
            'a&b',
            'a&b',
        ],
        [
            '/home',
            '/homes',
        ],
    ])('valueSource_WhenValueIs(%s)_ShouldNotMatch(%s)ThatDecodesToSomethingElse', (value, encoded) => {
        // Arrange
        const regex = anchored(QueryPattern.valueSource(value));

        // Act
        const isMatch = regex.test(encoded);

        // Assert
        expect(isMatch).toBe(false);
    });

    test('nameSource_WhenNameHasBrackets_ShouldMatchItTypedOrEncoded', () => {
        // Arrange
        const regex = anchored(QueryPattern.nameSource('ids[]'));

        // Act
        const matchesTyped = regex.test('ids[]');
        const matchesEncoded = regex.test('ids%5B%5D');

        // Assert
        expect(matchesTyped).toBe(true);
        expect(matchesEncoded).toBe(true);
    });

    test('nameSource_WhenNameHasAnEqualsSign_ShouldOnlyMatchItEncoded', () => {
        // Arrange
        const regex = anchored(QueryPattern.nameSource('a=b'));

        // Act
        const matchesTyped = regex.test('a=b');
        const matchesEncoded = regex.test('a%3Db');

        // Assert
        expect(matchesTyped).toBe(false);
        expect(matchesEncoded).toBe(true);
    });
});
