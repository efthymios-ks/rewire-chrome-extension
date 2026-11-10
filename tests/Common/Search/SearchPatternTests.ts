import { describe, expect, test } from "vitest";
import { SearchPattern } from "../../../src/Common/Search/SearchPattern";

describe("SearchPattern", () => {
    test("create_WhenTheTextIsPlain_ShouldMatchItLiterallyAndIgnoreCase", () => {
        // Arrange
        const query = {
            text: "a.b",
            isRegex: false,
        };

        // Act
        const pattern = SearchPattern.create(query);

        // Assert
        const regex = pattern.hasErrors ? null : pattern.value;
        expect(SearchPattern.countIn(regex!, "A.B a.b axb")).toBe(2);
    });

    test("create_WhenTheTextIsARegex_ShouldUseItAndIgnoreCase", () => {
        // Arrange
        const query = {
            text: "user/\\d+",
            isRegex: true,
        };

        // Act
        const pattern = SearchPattern.create(query);

        // Assert
        const regex = pattern.hasErrors ? null : pattern.value;
        expect(SearchPattern.countIn(regex!, "USER/42 user/7 user/x")).toBe(2);
    });

    test("create_WhenTheRegexIsInvalid_ShouldFail", () => {
        // Arrange
        const query = {
            text: "(",
            isRegex: true,
        };

        // Act
        const pattern = SearchPattern.create(query);

        // Assert
        expect(pattern.hasErrors).toBe(true);
    });

    test("create_WhenTheTextIsEmpty_ShouldReturnNoPattern", () => {
        // Arrange
        const query = {
            text: "",
            isRegex: false,
        };

        // Act
        const pattern = SearchPattern.create(query);

        // Assert
        expect(pattern).toEqual({
            hasErrors: false,
            value: null,
        });
    });
});
