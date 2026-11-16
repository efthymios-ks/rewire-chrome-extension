import { describe, expect, test } from 'vitest';
import { SnippetBodies } from './SnippetBodies';
import { SnippetHeaders } from './SnippetHeaders';
import { SnippetRequests } from './SnippetRequests';
import { aSnapshot, DEFAULTS, header } from './SnippetTestData';

describe('SnippetRequests', () => {
    test('of_WhenTheSnapshotHasCookiesAndTransportHeaders_ShouldSplitCookiesAndDropTheRest', () => {
        // Arrange
        const snapshot = aSnapshot();

        // Act
        const request = SnippetRequests.of(snapshot, DEFAULTS);

        // Assert
        expect(request.headers.map(entry => entry.name)).toEqual([
            'Content-Type',
            'X-Tenant',
        ]);
        expect(SnippetRequests.cookieTextOf(request)).toBe('session=1; theme=dark');
        expect(request.body).toEqual(SnippetBodies.text("{\"name\":\"O'Neil\"}"));
    });

    test('of_WhenTheBodyIsEmpty_ShouldHaveNoBody', () => {
        // Arrange
        const snapshot = aSnapshot({
            body: '',
        });

        // Act
        const request = SnippetRequests.of(snapshot, DEFAULTS);

        // Assert
        expect(SnippetBodies.hasBody(request.body)).toBe(false);
    });

    test('merged_WhenAHeaderRepeats_ShouldJoinItsValues', () => {
        // Arrange
        const headers = [
            header('Accept', 'application/json'),
            header('accept', 'text/plain'),
        ];

        // Act
        const merged = SnippetHeaders.merged(headers);

        // Assert
        expect(merged).toEqual([header('Accept', 'application/json, text/plain')]);
    });
});
