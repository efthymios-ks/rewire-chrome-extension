import { describe, expect, test } from 'vitest';
import { FetchNodeSnippet } from './FetchNodeSnippet';
import { SnippetBodies } from './SnippetBodies';
import { aSnapshot, aSnippetRequest, DEFAULTS, header } from './SnippetTestData';

describe('FetchNodeSnippet', () => {
    test('toString_WhenCookiesAreIncluded_ShouldSendThemAsAHeader', () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [
                header('Accept-Encoding', 'gzip'),
                header('User-Agent', 'Mozilla/5.0'),
                header('Cookie', 'session=1'),
            ],
        });

        // Act
        const text = FetchNodeSnippet.from(snapshot, DEFAULTS).toString();

        // Assert
        expect(text).toContain('"User-Agent": "Mozilla/5.0",');
        expect(text).toContain('"Cookie": "session=1"');
        expect(text).not.toContain('Accept-Encoding');
        expect(text).not.toContain('credentials');
    });

    test('tryParse_WhenGivenAnyText_ShouldReturnNull', () => {
        // Arrange
        const text = 'await fetch("https://api.example.com/users");';

        // Act
        const snippet = FetchNodeSnippet.tryParse(text);

        // Assert
        expect(snippet).toBeNull();
    });

    test('toString_WhenTheBodyIsAFile_ShouldReadItFromDisk', () => {
        // Arrange
        const snippet = new FetchNodeSnippet(aSnippetRequest({
            body: SnippetBodies.file('payload.bin'),
        }));

        // Act
        const text = snippet.toString();

        // Assert
        expect(text.split('\n')[0]).toBe('import { readFile } from "node:fs/promises";');
        expect(text).toContain('body: new Blob([await readFile("payload.bin")]),');
    });

    test('from_WhenTheRequestCarriesContentEncodingAndLength_ShouldLeaveBothOut', () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [
                ...aSnapshot().headers,
                header('Content-Encoding', 'gzip'),
            ],
        });

        // Act
        const text = FetchNodeSnippet.from(snapshot, DEFAULTS).toString();

        // Assert
        expect(text).not.toMatch(/content-encoding/i);
        expect(text).not.toMatch(/content-length/i);
        expect(text).toContain('X-Tenant');
    });
});
