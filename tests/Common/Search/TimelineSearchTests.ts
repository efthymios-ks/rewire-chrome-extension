import { describe, expect, test } from "vitest";
import { SearchPattern } from "../../../src/Common/Search/SearchPattern";
import { type SearchableEntry, TimelineSearch } from "../../../src/Common/Search/TimelineSearch";
import { SearchFields, type SearchQuery } from "../../../src/Contracts/Search/SearchQuery";

function aQuery(overrides: Partial<SearchQuery> = {}): SearchQuery {
    return {
        text: "ada",
        isRegex: false,
        ...overrides,
    };
}

function anEntry(overrides: Partial<SearchableEntry> = {}): SearchableEntry {
    return {
        id: "request-1",
        url: "https://api.example.com/users/ada",
        requestBody: null,
        responseBody: "{\"name\":\"Ada\",\"friend\":\"ada\"}",
        requestHeaders: [],
        responseHeaders: [
            {
                name: "X-User",
                value: "ADA",
            },
        ],
        ...overrides,
    };
}

describe("TimelineSearch", () => {
    test("search_WhenTheTextAppearsInSeveralFields_ShouldCountEveryOccurrence", () => {
        // Arrange
        const entries = [anEntry()];

        // Act
        const result = TimelineSearch.search(entries, aQuery());

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [
                {
                    entryId: "request-1",
                    fields: [
                        SearchFields.Url,
                        SearchFields.ResponseBody,
                        SearchFields.ResponseHeaders,
                    ],
                    count: 4,
                },
            ],
        });
    });

    test("search_WhenTheQueryIsUpperCase_ShouldStillMatchEveryCase", () => {
        // Arrange
        const query = aQuery({
            text: "ADA",
        });

        // Act
        const result = TimelineSearch.search([anEntry()], query);

        // Assert
        expect(result.hasErrors ? 0 : result.value[0]?.count).toBe(4);
    });

    test("search_WhenNoFieldHoldsTheText_ShouldReturnNothing", () => {
        // Arrange
        const query = aQuery({
            text: "nowhere-to-be-found",
        });

        // Act
        const result = TimelineSearch.search([anEntry()], query);

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [],
        });
    });

    test("search_WhenTheRegexIsInvalid_ShouldFail", () => {
        // Arrange
        const query = aQuery({
            text: "(",
            isRegex: true,
        });

        // Act
        const result = TimelineSearch.search([anEntry()], query);

        // Assert
        expect(result.hasErrors).toBe(true);
    });

    test("search_WhenTheTextIsEmpty_ShouldReturnNothing", () => {
        // Arrange
        const query = aQuery({
            text: "",
        });

        // Act
        const result = TimelineSearch.search([anEntry()], query);

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [],
        });
    });
});

describe("SearchPattern", () => {
    test("create_WhenTheTextHasRegexCharacters_ShouldEscapeThemUnlessRegexIsOn", () => {
        // Arrange
        const query = aQuery({
            text: "a.b",
        });

        // Act
        const pattern = SearchPattern.create(query);

        // Assert
        expect(pattern.hasErrors ? 0 : SearchPattern.countIn(pattern.value!, "a.b axb")).toBe(1);
    });

    test("countIn_WhenThePatternMatchesEmpty_ShouldStop", () => {
        // Arrange
        const pattern = /x*/g;

        // Act
        const count = SearchPattern.countIn(pattern, "abc");

        // Assert
        expect(count).toBe(0);
    });
});
