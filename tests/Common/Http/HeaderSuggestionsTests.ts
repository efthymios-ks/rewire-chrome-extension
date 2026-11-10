import { describe, expect, test } from "vitest";
import { HeaderSuggestions } from "../../../src/Common/Http/HeaderSuggestions";
import { MediaTypeNames } from "../../../src/Contracts/Http/MediaTypeNames";

describe("HeaderSuggestions", () => {
    test.each([
        "Content-Type",
        "content-type",
        " CONTENT-TYPE ",
    ])("valuesFor_WhenTheHeaderIs(%s)_ShouldSuggestEveryMediaType", name => {
        // Arrange
        const headerName = name;

        // Act
        const values = HeaderSuggestions.valuesFor(headerName);

        // Assert
        expect(values).toHaveLength(Object.values(MediaTypeNames).length);
        expect(values).toContain("application/json");
    });

    test.each([
        [
            "Accept",
            "*/*",
        ],
        [
            "Accept-Encoding",
            "gzip",
        ],
        [
            "Cache-Control",
            "no-cache",
        ],
        [
            "X-Frame-Options",
            "DENY",
        ],
    ])("valuesFor_WhenTheHeaderIs(%s)_ShouldSuggest(%s)", (name, expected) => {
        // Arrange
        const headerName = name;

        // Act
        const values = HeaderSuggestions.valuesFor(headerName);

        // Assert
        expect(values).toContain(expected);
    });

    test.each([
        "Authorization",
        "X-Tenant",
        "",
    ])("valuesFor_WhenTheHeaderHasNoKnownValues(%s)_ShouldSuggestNothing", name => {
        // Arrange
        const headerName = name;

        // Act
        const values = HeaderSuggestions.valuesFor(headerName);

        // Assert
        expect(values).toEqual([]);
    });

    test("names_WhenListed_ShouldBeSortedWithoutCaseAndIncludeTheCommonHeaders", () => {
        // Arrange
        const expected = [
            "Accept",
            "Authorization",
            "Content-Type",
        ];

        // Act
        const names = HeaderSuggestions.names();

        // Assert
        expect(names).toEqual(expect.arrayContaining(expected));
        expect([...names]).toEqual(names.toSorted((left, right) => left.localeCompare(right, undefined, {
            sensitivity: "base",
        })));
    });
});
