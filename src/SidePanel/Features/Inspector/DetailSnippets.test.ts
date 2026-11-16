import { describe, expect, test } from 'vitest';
import { DEFAULT_SNIPPET_PARTS } from '../../../Common/CodeGen/DefaultSnippetParts';
import { WgetSnippet } from '../../../Common/CodeGen/WgetSnippet';
import { DetailSnippets } from './DetailSnippets';
import { aDetail, aSummary } from '../../../TestData';

describe('DetailSnippets', () => {
    test('snapshotOf_WhenGivenADetail_ShouldTakeTheRequestAsSentAfterRules', () => {
        // Arrange
        const detail = aDetail({
            summary: aSummary({
                method: 'PUT',
                url: 'https://api.example.com/users/42',
            }),
            requestBody: '{}',
        });

        // Act
        const snapshot = DetailSnippets.snapshotOf(detail);

        // Assert
        expect(snapshot).toEqual({
            method: 'PUT',
            url: 'https://api.example.com/users/42',
            headers: detail.requestHeaders,
            body: '{}',
        });
    });

    test('of_WhenGivenASnippetId_ShouldRenderThatFormat', () => {
        // Arrange
        const snapshot = DetailSnippets.snapshotOf(aDetail());

        // Act
        const text = DetailSnippets.of({
            snapshot,
            snippetId: WgetSnippet.id,
            options: DEFAULT_SNIPPET_PARTS,
        });

        // Assert
        expect(text).toBe(WgetSnippet.from(snapshot).toString());
    });
});
