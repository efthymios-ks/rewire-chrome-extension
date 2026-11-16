import { describe, expect, test } from 'vitest';
import { SnippetBodies } from './SnippetBodies';
import { WgetSnippet } from './WgetSnippet';
import { aSnapshot, aSnippetRequest, DEFAULTS, header } from './SnippetTestData';

describe('WgetSnippet', () => {
    test('toString_WhenEverythingIsIncluded_ShouldPrintTheBodyToStandardOutput', () => {
        // Arrange
        const snapshot = aSnapshot();

        // Act
        const text = WgetSnippet.from(snapshot, DEFAULTS).toString();

        // Assert
        expect(text).toBe([
            'wget',
            '  --method=POST',
            "  --header='Content-Type: application/json'",
            "  --header='X-Tenant: blue'",
            "  --header='Cookie: session=1; theme=dark'",
            "  --body-data='{\"name\":\"O'\\''Neil\"}'",
            '  --content-on-error',
            '  -O -',
            "  'https://api.example.com/users?tag=a&tag=b'",
        ].join(' \\\n'));
    });

    test.each([
        [
            'GET',
            null,
            false,
        ],
        [
            'GET',
            'q=1',
            true,
        ],
        [
            'DELETE',
            null,
            true,
        ],
    ])('toString_WhenMethodIs(%s)AndBodyIs(%s)_ShouldNameTheMethod(%s)', (
        method,
        body,
        expected,
    ) => {
        // Arrange
        const snapshot = aSnapshot({
            method,
            body,
        });

        // Act
        const text = WgetSnippet.from(snapshot, DEFAULTS).toString();

        // Assert
        expect(text.includes(`--method=${method}`)).toBe(expected);
    });

    test('tryParse_WhenTheCommandWasMadeByRewire_ShouldReadItBack', () => {
        // Arrange
        const made = WgetSnippet.from(
            /* snapshot: */ aSnapshot(),
            /* options: */ DEFAULTS,
        );

        // Act
        const parsed = WgetSnippet.tryParse(made.toString());

        // Assert
        expect(parsed?.method).toBe(made.method);
        expect(parsed?.url).toBe(made.url);
        expect(parsed?.headers).toEqual(made.headers);
        expect(parsed?.cookies).toEqual(made.cookies);
        expect(parsed?.body).toEqual(made.body);
    });

    test('tryParse_WhenTheTextIsCurl_ShouldReturnNull', () => {
        // Arrange
        const text = 'curl https://api.example.com/users';

        // Act
        const snippet = WgetSnippet.tryParse(text);

        // Assert
        expect(snippet).toBeNull();
    });

    test('toString_WhenTheBodyIsAFile_ShouldSendTheFile', () => {
        // Arrange
        const snippet = new WgetSnippet(aSnippetRequest({
            body: SnippetBodies.file('payload.bin'),
        }));

        // Act
        const text = snippet.toString();

        // Assert
        expect(text).toContain("--body-file='payload.bin'");
    });

    test('toString_WhenTheBodyIsAMultipartForm_ShouldSayWgetCannotSendIt', () => {
        // Arrange
        const snippet = new WgetSnippet(aSnippetRequest({
            body: SnippetBodies.multipart([SnippetBodies.textPart('title', 'Hello')]),
        }));

        // Act
        const text = snippet.toString();

        // Assert
        expect(text.split('\n')[0]).toBe("# wget can't send multipart forms, so the form is left out.");
        expect(text).not.toContain('--body-data');
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
        const text = WgetSnippet.from(snapshot, DEFAULTS).toString();

        // Assert
        expect(text).not.toMatch(/content-encoding/i);
        expect(text).not.toMatch(/content-length/i);
        expect(text).toContain('X-Tenant');
    });
});
