import { describe, expect, test } from "vitest";
import type { SearchMatch } from "../../../../src/Contracts/Search/SearchQuery";
import { SearchFields } from "../../../../src/Contracts/Search/SearchQuery";
import type { TrafficSearchState } from "../../../../src/SidePanel/Core/TrafficSearchState";
import { SearchStatusText } from "../../../../src/SidePanel/Features/Traffic/SearchStatusText";

function aSearchState(overrides: Partial<TrafficSearchState> = {}): TrafficSearchState {
    return {
        query: {
            text: "ada",
            isCaseSensitive: false,
            isRegex: false,
        },
        matches: [],
        activeIndex: -1,
        error: null,
        ...overrides,
    };
}

function matches(count: number): SearchMatch[] {
    return Array.from({
        length: count,
    }, (_, index) => ({
        entryId: `request-${index}`,
        fields: [SearchFields.ResponseBody],
        count: 1,
    }));
}

describe("SearchStatusText", () => {
    test("of_WhenAMatchIsSelected_ShouldShowItsPositionOfTheTotal", () => {
        // Arrange
        const state = aSearchState({
            matches: matches(7),
            activeIndex: 1,
        });

        // Act
        const text = SearchStatusText.of(state);

        // Assert
        expect(text).toBe("2 of 7");
    });

    test("of_WhenNothingMatches_ShouldSayNoMatches", () => {
        // Arrange
        const state = aSearchState();

        // Act
        const text = SearchStatusText.of(state);

        // Assert
        expect(text).toBe("No matches");
    });

    test("of_WhenMatchesExistButNoneIsSelected_ShouldCountThem", () => {
        // Arrange
        const state = aSearchState({
            matches: matches(3),
        });

        // Act
        const text = SearchStatusText.of(state);

        // Assert
        expect(text).toBe("3 matches");
    });

    test("of_WhenTheSearchIsEmpty_ShouldShowNothing", () => {
        // Arrange
        const state = aSearchState({
            query: {
                text: "",
                isCaseSensitive: false,
                isRegex: false,
            },
        });

        // Act
        const text = SearchStatusText.of(state);

        // Assert
        expect(text).toBe("");
    });

    test("of_WhenTheRegexIsInvalid_ShouldShowTheError", () => {
        // Arrange
        const state = aSearchState({
            error: "Invalid regular expression.",
        });

        // Act
        const text = SearchStatusText.of(state);

        // Assert
        expect(text).toBe("Invalid regular expression.");
    });
});
