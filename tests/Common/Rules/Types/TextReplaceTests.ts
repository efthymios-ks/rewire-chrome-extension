import { describe, expect, test } from "vitest";
import { TextReplace } from "../../../../src/Common/Rules/Types/TextReplace";

describe("TextReplace", () => {
    test("apply_WhenFindIsPlainText_ShouldReplaceEveryOccurrenceLiterally", () => {
        // Arrange
        const replacement = {
            find: ".",
            replace: "-",
            isRegex: false,
        };

        // Act
        const text = TextReplace.apply("api.example.com", replacement);

        // Assert
        expect(text).toBe("api-example-com");
    });

    test("apply_WhenPlainReplaceHasDollarSigns_ShouldInsertThemAsIs", () => {
        // Arrange
        const replacement = {
            find: "price",
            replace: "$1 and $&",
            isRegex: false,
        };

        // Act
        const text = TextReplace.apply("price: 5", replacement);

        // Assert
        expect(text).toBe("$1 and $&: 5");
    });

    test("apply_WhenFindIsEmpty_ShouldReturnTheTextAsIs", () => {
        // Arrange
        const replacement = {
            find: "",
            replace: "x",
            isRegex: true,
        };

        // Act
        const text = TextReplace.apply("abc", replacement);

        // Assert
        expect(text).toBe("abc");
    });

    test("apply_WhenFindIsARegex_ShouldReplaceEveryMatchWithItsGroups", () => {
        // Arrange
        const replacement = {
            find: "user-(\\d)",
            replace: "id:$1",
            isRegex: true,
        };

        // Act
        const text = TextReplace.apply("user-1, user-2", replacement);

        // Assert
        expect(text).toBe("id:1, id:2");
    });

    test("apply_WhenRegexUsesAnRe2NamedGroup_ShouldSupportIt", () => {
        // Arrange
        const replacement = {
            find: "(?P<id>\\d+)",
            replace: "<$<id>>",
            isRegex: true,
        };

        // Act
        const text = TextReplace.apply("order 42", replacement);

        // Assert
        expect(text).toBe("order <42>");
    });

    test("apply_WhenRegexIsInvalid_ShouldReturnTheTextAsIs", () => {
        // Arrange
        const replacement = {
            find: "(unclosed",
            replace: "x",
            isRegex: true,
        };

        // Act
        const text = TextReplace.apply("(unclosed", replacement);

        // Assert
        expect(text).toBe("(unclosed");
    });
});
