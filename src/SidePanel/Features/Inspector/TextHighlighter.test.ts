import { describe, expect, test } from 'vitest';
import { TextHighlighter } from './TextHighlighter';

function render(parts: Array<Node | string>): string {
    return parts
        .map(part => typeof part === 'string' ? part : `[${part.textContent}]`)
        .join('');
}

describe('TextHighlighter', () => {
    test('build_WhenThereIsNoQuery_ShouldReturnThePlainText', () => {
        // Arrange
        const query = null;

        // Act
        const parts = TextHighlighter.build('GET /users', query);

        // Assert
        expect(parts).toEqual(['GET /users']);
    });

    test('build_WhenTheQueryIsEmpty_ShouldReturnThePlainText', () => {
        // Arrange
        const query = {
            text: '',
            isRegex: false,
        };

        // Act
        const parts = TextHighlighter.build('GET /users', query);

        // Assert
        expect(parts).toEqual(['GET /users']);
    });

    test('build_WhenTheRegexIsInvalid_ShouldReturnThePlainText', () => {
        // Arrange
        const query = {
            text: '(',
            isRegex: true,
        };

        // Act
        const parts = TextHighlighter.build('GET /users(1)', query);

        // Assert
        expect(parts).toEqual(['GET /users(1)']);
    });

    test('build_WhenTheTextMatchesSeveralTimes_ShouldMarkEachMatchIgnoringCase', () => {
        // Arrange
        const query = {
            text: 'user',
            isRegex: false,
        };

        // Act
        const parts = TextHighlighter.build('/users/42/User', query);

        // Assert
        expect(render(parts)).toBe('/[user]s/42/[User]');
        const tagNames = parts
            .filter(part => part instanceof HTMLElement)
            .map(part => (part as HTMLElement).tagName);
        expect(tagNames).toEqual([
            'MARK',
            'MARK',
        ]);
    });

    test('build_WhenThePlainQueryHasRegexCharacters_ShouldMatchThemLiterally', () => {
        // Arrange
        const query = {
            text: '.json',
            isRegex: false,
        };

        // Act
        const parts = TextHighlighter.build('data.json xjson', query);

        // Assert
        expect(render(parts)).toBe('data[.json] xjson');
    });

    test('build_WhenARegexQueryIsGiven_ShouldMarkItsMatches', () => {
        // Arrange
        const query = {
            text: '\\d+',
            isRegex: true,
        };

        // Act
        const parts = TextHighlighter.build('/users/42/orders/7', query);

        // Assert
        expect(render(parts)).toBe('/users/[42]/orders/[7]');
    });

    test('build_WhenNothingMatches_ShouldReturnThePlainText', () => {
        // Arrange
        const query = {
            text: 'orders',
            isRegex: false,
        };

        // Act
        const parts = TextHighlighter.build('/users/42', query);

        // Assert
        expect(render(parts)).toBe('/users/42');
        expect(parts.every(part => typeof part === 'string')).toBe(true);
    });

    test('build_WhenTheRegexOnlyMatchesEmptyText_ShouldReturnThePlainText', () => {
        // Arrange
        const query = {
            text: 'x*',
            isRegex: true,
        };

        // Act
        const parts = TextHighlighter.build('abc', query);

        // Assert
        expect(render(parts)).toBe('abc');
    });

    test('build_WhenTheRegexMatchesEmptyTextBeforeARealMatch_ShouldHighlightTheRealMatch', () => {
        // Arrange
        const query = {
            text: 'a*',
            isRegex: true,
        };

        // Act
        const parts = TextHighlighter.build('baa', query);

        // Assert
        expect(render(parts)).toBe('b[aa]');
    });
});
