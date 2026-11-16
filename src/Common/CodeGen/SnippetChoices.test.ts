import { describe, expect, test } from 'vitest';
import type { RequestSnapshot } from './RequestSnapshot';
import { SnippetChoices } from './SnippetChoices';
import { aSnapshot, header } from './SnippetTestData';

function aSnapshotWithRepeatedHeaders(overrides: Partial<RequestSnapshot> = {}): RequestSnapshot {
    return aSnapshot({
        url: 'https://api.example.com/users?tag=a&tag=b&page=2',
        headers: [
            header('Content-Type', 'application/json'),
            header('X-Tenant', 'blue'),
            header('x-tenant', 'green'),
            header('Cookie', 'session=1; theme=dark'),
            header('Cookie', 'session=2'),
            header(':authority', 'api.example.com'),
            header('Content-Length', '13'),
        ],
        body: '{}',
        ...overrides,
    });
}

describe('SnippetChoices', () => {
    test('headersOf_WhenHeadersRepeatOrAreNeverSent_ShouldListEachSendableHeaderOnce', () => {
        // Arrange
        const snapshot = aSnapshotWithRepeatedHeaders();

        // Act
        const choices = SnippetChoices.headersOf(snapshot);

        // Assert
        expect(choices).toEqual([
            {
                key: 'content-type',
                label: 'Content-Type',
            },
            {
                key: 'x-tenant',
                label: 'X-Tenant',
            },
        ]);
    });

    test('cookiesOf_WhenCookieHeadersRepeat_ShouldListEachCookieNameOnce', () => {
        // Arrange
        const snapshot = aSnapshotWithRepeatedHeaders();

        // Act
        const choices = SnippetChoices.cookiesOf(snapshot);

        // Assert
        expect(choices.map(choice => choice.key)).toEqual([
            'session',
            'theme',
        ]);
    });

    test('queryParamsOf_WhenKeysRepeat_ShouldListEachKeyOnce', () => {
        // Arrange
        const snapshot = aSnapshotWithRepeatedHeaders();

        // Act
        const choices = SnippetChoices.queryParamsOf(snapshot);

        // Assert
        expect(choices.map(choice => choice.key)).toEqual([
            'tag',
            'page',
        ]);
    });

    test.each([
        [
            '{}',
            true,
        ],
        [
            '',
            false,
        ],
        [
            null,
            false,
        ],
    ])('hasBody_WhenTheBodyIs(%j)_ShouldReturn(%s)', (body, expected) => {
        // Arrange
        const snapshot = aSnapshotWithRepeatedHeaders({
            body,
        });

        // Act
        const hasBody = SnippetChoices.hasBody(snapshot);

        // Assert
        expect(hasBody).toBe(expected);
    });
});
