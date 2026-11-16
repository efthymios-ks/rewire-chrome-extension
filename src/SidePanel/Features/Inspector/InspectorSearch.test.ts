import { describe, expect, test } from 'vitest';
import type { SearchQuery } from '../../../Contracts/Search/SearchQuery';
import { SEARCH_SCOPES } from '../../../Contracts/Search/SearchScope';
import type { PanelState } from '../../Core/PanelState';
import { PanelStateFactory } from '../../Core/PanelStateFactory';
import { InspectorSearch } from './InspectorSearch';

interface SearchingOptions {
    text: string;
    scopes?: SearchQuery['scopes'];
    error?: string | null;
}

function searching({
    text,
    scopes = [SEARCH_SCOPES.ResponseBody],
    error = null,
}: SearchingOptions): PanelState {
    const state = PanelStateFactory.initial();

    return {
        ...state,
        search: {
            ...state.search,
            query: {
                text,
                isRegex: false,
                scopes,
            },
            error,
        },
    };
}

describe('InspectorSearch', () => {
    test('bodyQueryOf_WhenNothingIsTyped_ShouldBeNull', () => {
        // Arrange
        const state = searching({
            text: '',
        });

        // Act
        const query = InspectorSearch.bodyQueryOf(state, SEARCH_SCOPES.ResponseBody);

        // Assert
        expect(query).toBeNull();
    });

    test('bodyQueryOf_WhenTheRegexIsBroken_ShouldBeNull', () => {
        // Arrange
        const state = searching({
            text: '(',
            error: 'Unterminated group',
        });

        // Act
        const query = InspectorSearch.bodyQueryOf(state, SEARCH_SCOPES.ResponseBody);

        // Assert
        expect(query).toBeNull();
    });

    test('bodyQueryOf_WhenOnlyTheOtherSidesBodyIsSearched_ShouldBeNull', () => {
        // Arrange
        const state = searching({
            text: 'ada',
            scopes: [
                SEARCH_SCOPES.Url,
                SEARCH_SCOPES.RequestBody,
                SEARCH_SCOPES.ResponseHeaders,
            ],
        });

        // Act
        const query = InspectorSearch.bodyQueryOf(state, SEARCH_SCOPES.ResponseBody);

        // Assert
        expect(query).toBeNull();
        expect(InspectorSearch.bodyKeyOf(state, SEARCH_SCOPES.ResponseBody)).toBe('null');
    });

    test('bodyQueryOf_WhenThatSidesBodyIsSearched_ShouldReturnTheQuery', () => {
        // Arrange
        const state = searching({
            text: 'ada',
        });

        // Act
        const query = InspectorSearch.bodyQueryOf(state, SEARCH_SCOPES.ResponseBody);

        // Assert
        expect(query).toEqual({
            text: 'ada',
            isRegex: false,
            scopes: [SEARCH_SCOPES.ResponseBody],
        });
        expect(InspectorSearch.bodyKeyOf(state, SEARCH_SCOPES.ResponseBody))
            .toBe('{"text":"ada","isRegex":false,"scopes":["responseBody"]}');
    });
});
