import { describe, expect, test } from "vitest";
import { CookieHeader } from "../../../../src/Common/Rules/Http/CookieHeader";

describe("CookieHeader", () => {
    test.each([
        null,
        "",
        "   ",
    ])("parse_WhenHeaderIs(%s)_ShouldReturnEmpty", header => {
        // Arrange
        const text = header;

        // Act
        const pairs = CookieHeader.parse(text);

        // Assert
        expect(pairs).toEqual([]);
    });

    test("parse_WhenPairsHaveSpacesFlagsAndEqualsInValues_ShouldSplitOnFirstEquals", () => {
        // Arrange
        const header = " session = abc ; flag;; token=a=b==";

        // Act
        const pairs = CookieHeader.parse(header);

        // Assert
        expect(pairs).toEqual([
            {
                name: "session",
                value: "abc",
            },
            {
                name: "flag",
                value: "",
            },
            {
                name: "token",
                value: "a=b==",
            },
        ]);
    });

    test("serialize_WhenPairsAreGiven_ShouldJoinWithSemicolonAndSpace", () => {
        // Arrange
        const pairs = [
            {
                name: "session",
                value: "abc",
            },
            {
                name: "theme",
                value: "dark",
            },
        ];

        // Act
        const header = CookieHeader.serialize(pairs);

        // Assert
        expect(header).toBe("session=abc; theme=dark");
    });

    test("valuesOf_WhenNameRepeats_ShouldReturnEveryValueWithExactName", () => {
        // Arrange
        const header = "id=1; ID=2; id=3";

        // Act
        const values = CookieHeader.valuesOf(header, "id");

        // Assert
        expect(values).toEqual([
            "1",
            "3",
        ]);
    });

    test("set_WhenCookieExists_ShouldReplaceItAndMoveItToTheEnd", () => {
        // Arrange
        const header = "session=abc; theme=dark; session=old";

        // Act
        const updated = CookieHeader.set(
            header,
            "session",
            "new"
        );

        // Assert
        expect(updated).toBe("theme=dark; session=new");
    });

    test("set_WhenHeaderIsMissing_ShouldStartANewHeader", () => {
        // Arrange
        const header = null;

        // Act
        const updated = CookieHeader.set(
            header,
            "ab",
            "B"
        );

        // Assert
        expect(updated).toBe("ab=B");
    });

    test("remove_WhenCookieIsLastOne_ShouldReturnEmptyText", () => {
        // Arrange
        const header = "session=abc";

        // Act
        const updated = CookieHeader.remove(header, "session");
        const untouched = CookieHeader.remove("theme=dark", "session");

        // Assert
        expect(updated).toBe("");
        expect(untouched).toBe("theme=dark");
    });
});
