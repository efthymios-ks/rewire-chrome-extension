import { describe, expect, test } from 'vitest';
import { SEARCH_SCOPES } from '../../../Contracts/Search/SearchScope';
import { CONTENT_KIND } from '../../../Contracts/Timeline/ContentKind';
import { CONTENT_FILTER_ID } from '../../Core/ContentFilterId';
import type { PanelState } from '../../Core/PanelState';
import { PanelStateFactory } from '../../Core/PanelStateFactory';
import { SearchStatusText } from './SearchStatusText';
import { aSummary } from '../../../TestData';
import { aSearchMatching } from '../../PanelTestData';

const ENTRIES = [
    aSummary({
        id: 'request-1',
        contentKind: CONTENT_KIND.Json,
    }),
    aSummary({
        id: 'request-2',
        contentKind: CONTENT_KIND.Other,
    }),
    aSummary({
        id: 'request-3',
        contentKind: CONTENT_KIND.Json,
    }),
];

function aState(overrides: Partial<PanelState> = {}): PanelState {
    return {
        ...PanelStateFactory.initial(),
        entries: ENTRIES,
        ...overrides,
    };
}

describe('SearchStatusText', () => {
    test('of_WhenAListedCallIsSelected_ShouldStillCountTheMatches', () => {
        // Arrange
        const state = aState({
            search: aSearchMatching(['request-1', 'request-2', 'request-3']),
            selectedEntryId: 'request-2',
        });

        // Act
        const text = SearchStatusText.of(state);

        // Assert
        expect(text).toBe('3 matches');
    });

    test('of_WhenNothingMatches_ShouldSayNoMatches', () => {
        // Arrange
        const state = aState({
            search: aSearchMatching([]),
        });

        // Act
        const text = SearchStatusText.of(state);

        // Assert
        expect(text).toBe('No matches');
    });

    test('of_WhenCallsMatchButNoneIsSelected_ShouldCountThem', () => {
        // Arrange
        const state = aState({
            search: aSearchMatching(['request-1', 'request-3']),
        });

        // Act
        const text = SearchStatusText.of(state);

        // Assert
        expect(text).toBe('2 matches');
    });

    test('of_WhenOneCallMatches_ShouldSayOneMatch', () => {
        // Arrange
        const state = aState({
            search: aSearchMatching(['request-3']),
        });

        // Act
        const text = SearchStatusText.of(state);

        // Assert
        expect(text).toBe('1 match');
    });

    test('of_WhenAContentFilterHidesAMatch_ShouldCountOnlyTheListedOnes', () => {
        // Arrange
        const state = aState({
            search: aSearchMatching(['request-1', 'request-2']),
            contentFilter: CONTENT_FILTER_ID.Json,
        });

        // Act
        const text = SearchStatusText.of(state);

        // Assert
        expect(text).toBe('1 match');
    });

    test('of_WhenTheSearchIsEmpty_ShouldShowNothing', () => {
        // Arrange
        const state = aState({
            search: aSearchMatching([], {
                query: {
                    text: '',
                    isRegex: false,
                    scopes: [SEARCH_SCOPES.Url],
                },
            }),
        });

        // Act
        const text = SearchStatusText.of(state);

        // Assert
        expect(text).toBe('');
    });

    test('of_WhenTheFirstAnswerHasNotArrived_ShouldShowNothing', () => {
        // Arrange
        const state = aState({
            search: aSearchMatching([], {
                searchedText: '',
            }),
        });

        // Act
        const text = SearchStatusText.of(state);

        // Assert
        expect(text).toBe('');
    });

    test('of_WhenTheRegexIsInvalid_ShouldShowTheError', () => {
        // Arrange
        const state = aState({
            search: aSearchMatching([], {
                error: 'Invalid regular expression.',
            }),
        });

        // Act
        const text = SearchStatusText.of(state);

        // Assert
        expect(text).toBe('Invalid regular expression.');
    });
});
