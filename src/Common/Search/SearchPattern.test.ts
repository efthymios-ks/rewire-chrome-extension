import { describe, expect, test } from 'vitest';
import { SearchPattern } from './SearchPattern';

describe('SearchPattern', () => {
    test('create_WhenTheTextIsPlain_ShouldMatchItLiterallyAndIgnoreCase', () => {
        // Arrange
        const query = {
            text: 'a.b',
            isRegex: false,
        };

        // Act
        const pattern = SearchPattern.create(query);

        // Assert
        const regex = pattern.hasErrors ? null : pattern.value;
        expect(SearchPattern.countIn(regex!, 'A.B a.b axb')).toBe(2);
    });

    test('create_WhenTheTextIsARegex_ShouldUseItAndIgnoreCase', () => {
        // Arrange
        const query = {
            text: 'user/\\d+',
            isRegex: true,
        };

        // Act
        const pattern = SearchPattern.create(query);

        // Assert
        const regex = pattern.hasErrors ? null : pattern.value;
        expect(SearchPattern.countIn(regex!, 'USER/42 user/7 user/x')).toBe(2);
    });

    test('create_WhenTheRegexIsInvalid_ShouldFail', () => {
        // Arrange
        const query = {
            text: '(',
            isRegex: true,
        };

        // Act
        const pattern = SearchPattern.create(query);

        // Assert
        expect(pattern.hasErrors).toBe(true);
    });

    test('create_WhenTheTextIsEmpty_ShouldReturnNoPattern', () => {
        // Arrange
        const query = {
            text: '',
            isRegex: false,
        };

        // Act
        const pattern = SearchPattern.create(query);

        // Assert
        expect(pattern).toEqual({
            hasErrors: false,
            value: null,
        });
    });

    test('countIn_WhenThePatternOnlyMatchesEmptyText_ShouldReturnZero', () => {
        // Arrange
        const pattern = /x*/g;

        // Act
        const count = SearchPattern.countIn(pattern, 'abc');

        // Assert
        expect(count).toBe(0);
    });

    test('countIn_WhenThePatternMatchesEmptyTextBeforeARealMatch_ShouldCountOnlyTheRealMatch', () => {
        // Arrange
        const pattern = /a*/g;

        // Act
        const count = SearchPattern.countIn(pattern, 'baa');

        // Assert
        expect(count).toBe(1);
    });

    test('countIn_WhenAStickyPatternMatchesEmptyText_ShouldStopWithoutLooping', () => {
        // Arrange
        const pattern = /a*/gy;

        // Act
        const count = SearchPattern.countIn(pattern, 'aab');

        // Assert
        expect(count).toBe(1);
    });

    test('countIn_WhenAUnicodePatternMatchesEmptyText_ShouldNotSplitSurrogatePairs', () => {
        // Arrange
        const pattern = /b*/gu;

        // Act
        const count = SearchPattern.countIn(pattern, '\u{1F600}bb\u{1F600}b');

        // Assert
        expect(count).toBe(2);
    });
});
