import { describe, expect, test } from 'vitest';
import { SEARCH_SCOPES } from '../../../Contracts/Search/SearchScope';
import { CONTENT_KIND } from '../../../Contracts/Timeline/ContentKind';
import { CONTENT_FILTER_ID } from '../../Core/ContentFilterId';
import type { PanelState } from '../../Core/PanelState';
import { PanelStateFactory } from '../../Core/PanelStateFactory';
import { VisibleEntries } from './VisibleEntries';
import { aSummary } from '../../../TestData';
import { aSearchMatching } from '../../PanelTestData';

function aState(overrides: Partial<PanelState>): PanelState {
    return {
        ...PanelStateFactory.initial(),
        ...overrides,
    };
}

const ENTRIES = [
    aSummary({
        id: 'json-api',
        contentKind: CONTENT_KIND.Json,
    }),
    aSummary({
        id: 'graphql',
        contentKind: CONTENT_KIND.GraphQl,
    }),
    aSummary({
        id: 'analytics',
        host: 'www.google-analytics.com',
        contentKind: CONTENT_KIND.Other,
    }),
];

describe('VisibleEntries', () => {
    test('of_WhenNoFilterIsSet_ShouldReturnNewestFirst', () => {
        // Arrange
        const state = aState({
            entries: ENTRIES,
        });

        // Act
        const visible = VisibleEntries.of(state);

        // Assert
        expect(visible.map(entry => entry.id)).toEqual([
            'analytics',
            'graphql',
            'json-api',
        ]);
    });

    test('of_WhenAContentFilterIsSet_ShouldKeepOnlyTheKind', () => {
        // Arrange
        const state = aState({
            entries: ENTRIES,
            contentFilter: CONTENT_FILTER_ID.GraphQl,
        });

        // Act
        const visible = VisibleEntries.of(state);

        // Assert
        expect(visible.map(entry => entry.id)).toEqual(['graphql']);
    });

    test('of_WhenAFrameIsPicked_ShouldKeepOnlyItsCalls', () => {
        // Arrange
        const state = aState({
            entries: [
                ...ENTRIES,
                aSummary({
                    id: 'payment',
                    frame: {
                        id: 'iframe-1',
                        url: 'https://pay.example.com/',
                        isTop: false,
                    },
                }),
            ],
            frameFilter: 'iframe-1',
        });

        // Act
        const visible = VisibleEntries.of(state);

        // Assert
        expect(visible.map(entry => entry.id)).toEqual(['payment']);
    });

    test('of_WhenASearchHasAnswered_ShouldKeepOnlyTheMatches', () => {
        // Arrange
        const state = aState({
            entries: ENTRIES,
            search: aSearchMatching(['json-api', 'analytics']),
        });

        // Act
        const visible = VisibleEntries.of(state);

        // Assert
        expect(visible.map(entry => entry.id)).toEqual([
            'analytics',
            'json-api',
        ]);
    });

    test('of_WhenASearchAndAContentFilterAreSet_ShouldKeepTheCallsBothAccept', () => {
        // Arrange
        const state = aState({
            entries: ENTRIES,
            contentFilter: CONTENT_FILTER_ID.Json,
            search: aSearchMatching(['json-api', 'graphql']),
        });

        // Act
        const visible = VisibleEntries.of(state);

        // Assert
        expect(visible.map(entry => entry.id)).toEqual(['json-api']);
    });

    test('of_WhenASearchAndAFrameAreSet_ShouldKeepTheCallsBothAccept', () => {
        // Arrange
        const payment = aSummary({
            id: 'payment',
            frame: {
                id: 'iframe-1',
                url: 'https://pay.example.com/',
                isTop: false,
            },
        });
        const refund = aSummary({
            id: 'refund',
            frame: payment.frame,
        });
        const state = aState({
            entries: [
                ...ENTRIES,
                payment,
                refund,
            ],
            frameFilter: 'iframe-1',
            search: aSearchMatching(['json-api', 'refund']),
        });

        // Act
        const visible = VisibleEntries.of(state);

        // Assert
        expect(visible.map(entry => entry.id)).toEqual(['refund']);
    });

    test('of_WhenTheSearchMatchesNothing_ShouldKeepNothing', () => {
        // Arrange
        const state = aState({
            entries: ENTRIES,
            search: aSearchMatching([]),
        });

        // Act
        const visible = VisibleEntries.of(state);

        // Assert
        expect(visible).toEqual([]);
    });

    test.each([
        [
            'an empty query',
            {
                query: {
                    text: '',
                    isRegex: false,
                    scopes: [SEARCH_SCOPES.Url],
                },
            },
        ],
        [
            'an invalid regex',
            {
                error: 'Invalid regular expression.',
            },
        ],
        [
            'no answer yet',
            {
                searchedText: '',
            },
        ],
    ])('of_WhenTheSearchHas(%s)_ShouldKeepEveryCall', (_, overrides) => {
        // Arrange
        const state = aState({
            entries: ENTRIES,
            search: aSearchMatching([], overrides),
        });

        // Act
        const visible = VisibleEntries.of(state);

        // Assert
        expect(visible).toHaveLength(ENTRIES.length);
    });
});
