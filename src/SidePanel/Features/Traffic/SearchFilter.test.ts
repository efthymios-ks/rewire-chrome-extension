import { describe, expect, test } from 'vitest';
import { SEARCH_SCOPES } from '../../../Contracts/Search/SearchScope';
import { SearchFilter } from './SearchFilter';
import { aSearchMatching } from '../../PanelTestData';

describe('SearchFilter', () => {
    test('matchedIdsOf_WhenTheSearchHasAnswered_ShouldReturnTheMatchedCalls', () => {
        // Arrange
        const search = aSearchMatching(['request-1', 'request-2']);

        // Act
        const matchedIds = SearchFilter.matchedIdsOf(search);

        // Assert
        expect(SearchFilter.isActive(search)).toBe(true);
        expect([...matchedIds ?? []]).toEqual(['request-1', 'request-2']);
    });

    test('matchedIdsOf_WhenNothingMatches_ShouldReturnAnEmptySet', () => {
        // Arrange
        const search = aSearchMatching([]);

        // Act
        const matchedIds = SearchFilter.matchedIdsOf(search);

        // Assert
        expect(matchedIds?.size).toBe(0);
    });

    test('matchedIdsOf_WhenTheTextIsEmpty_ShouldNotFilter', () => {
        // Arrange
        const search = aSearchMatching(['request-1'], {
            query: {
                text: '',
                isRegex: false,
                scopes: [SEARCH_SCOPES.Url],
            },
        });

        // Act
        const matchedIds = SearchFilter.matchedIdsOf(search);

        // Assert
        expect(SearchFilter.isActive(search)).toBe(false);
        expect(matchedIds).toBeNull();
    });

    test('matchedIdsOf_WhenTheRegexIsInvalid_ShouldNotFilter', () => {
        // Arrange
        const search = aSearchMatching([], {
            error: 'Invalid regular expression.',
        });

        // Act
        const matchedIds = SearchFilter.matchedIdsOf(search);

        // Assert
        expect(SearchFilter.isActive(search)).toBe(false);
        expect(matchedIds).toBeNull();
    });

    test('matchedIdsOf_WhenTheFirstAnswerHasNotArrived_ShouldNotFilter', () => {
        // Arrange
        const search = aSearchMatching([], {
            searchedText: '',
        });

        // Act
        const matchedIds = SearchFilter.matchedIdsOf(search);

        // Assert
        expect(SearchFilter.isActive(search)).toBe(false);
        expect(matchedIds).toBeNull();
    });
});
