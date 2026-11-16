import { describe, expect, test } from 'vitest';
import { CONTENT_KIND, type ContentKind } from '../../../Contracts/Timeline/ContentKind';
import { CONTENT_FILTER_ID, type ContentFilterId } from '../../Core/ContentFilterId';
import { CONTENT_FILTERS } from './ContentFilters';
import { aSummary } from '../../../TestData';

const ALL_KINDS: ContentKind[] = Object.values(CONTENT_KIND);

function acceptedKindsOf(id: ContentFilterId): ContentKind[] {
    const filter = CONTENT_FILTERS.find(candidate => candidate.id === id)!;

    return ALL_KINDS.filter(contentKind => filter.accepts(aSummary({
        contentKind,
    })));
}

describe('ContentFilters', () => {
    test('list_WhenRead_ShouldOfferEveryFilterInOrder', () => {
        // Arrange
        const expected = [
            'All',
            'JSON',
            'GraphQL',
            'Form Data',
            'Document',
        ];

        // Act
        const labels = CONTENT_FILTERS.map(filter => filter.label);

        // Assert
        expect(labels).toEqual(expected);
    });

    test.each([
        [
            CONTENT_FILTER_ID.All,
            ALL_KINDS,
        ],
        [
            CONTENT_FILTER_ID.Json,
            [CONTENT_KIND.Json],
        ],
        [
            CONTENT_FILTER_ID.GraphQl,
            [CONTENT_KIND.GraphQl],
        ],
        [
            CONTENT_FILTER_ID.FormData,
            [CONTENT_KIND.FormData],
        ],
    ])('accepts_WhenTheFilterIs%s_ShouldAcceptOnlyItsContentKinds', (id, expected) => {
        // Arrange
        const filterId = id;

        // Act
        const accepted = acceptedKindsOf(filterId);

        // Assert
        expect(accepted).toEqual(expected);
    });

    test.each([
        [
            'Document',
            true,
        ],
        [
            'Fetch',
            false,
        ],
        [
            'XHR',
            false,
        ],
        [
            'Ping',
            false,
        ],
    ])('accepts_WhenTheDocumentFilterSees(%s)_ShouldKeepOnlyPageNavigations', (resourceType, expected) => {
        // Arrange
        const filter = CONTENT_FILTERS.find(candidate => candidate.id === CONTENT_FILTER_ID.Document)!;

        // Act
        const accepted = filter.accepts(aSummary({
            resourceType,
            contentKind: CONTENT_KIND.FormData,
        }));

        // Assert
        expect(accepted).toBe(expected);
    });
});
