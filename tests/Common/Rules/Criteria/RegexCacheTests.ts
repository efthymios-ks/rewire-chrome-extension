import { describe, expect, test } from "vitest";
import { RegexCache } from "../../../../src/Common/Rules/Criteria/RegexCache";

const MaxCachedPatterns = 200;

describe("RegexCache", () => {
    test("compile_WhenSourceIsValid_ShouldReturnRegExp", () => {
        // Arrange
        const source = "^https://api\\.example\\.com/users/\\d+$";

        // Act
        const compiled = RegexCache.compile(source);

        // Assert
        expect(compiled.hasErrors).toBe(false);
        expect(!compiled.hasErrors && compiled.value.test("https://api.example.com/users/42")).toBe(true);
    });

    test("compile_WhenSourceIsInvalid_ShouldFailWithMessage", () => {
        // Arrange
        const source = "users/(";

        // Act
        const compiled = RegexCache.compile(source);

        // Assert
        expect(compiled.hasErrors).toBe(true);
        expect(compiled.hasErrors && compiled.error.length > 0).toBe(true);
    });

    test("compile_WhenSourceUsesRe2NamedGroup_ShouldReadItAsJavaScriptGroup", () => {
        // Arrange
        const source = "/users/(?P<id>\\d+)";

        // Act
        const compiled = RegexCache.compile(source);

        // Assert
        expect(compiled.hasErrors).toBe(false);
        expect(compiled.hasErrors ? null : compiled.value.exec("/users/42")?.groups?.["id"]).toBe("42");
    });

    test("compile_WhenSourceRepeats_ShouldReturnCachedResult", () => {
        // Arrange
        const source = "^/orders/\\d+$";
        const first = RegexCache.compile(source);

        // Act
        const second = RegexCache.compile(source);

        // Assert
        expect(second).toBe(first);
    });

    test("compile_WhenCacheFillsUp_ShouldStartOver", () => {
        // Arrange
        const source = "^/seed$";
        const first = RegexCache.compile(source);
        for (let index = 0; index < MaxCachedPatterns; index += 1) {
            RegexCache.compile(`^/filler/${index}$`);
        }

        // Act
        const again = RegexCache.compile(source);

        // Assert
        expect(again).not.toBe(first);
        expect(again).toEqual(first);
    });

    test.each([
        [
            "^/users/\\d+$",
            "/users/42",
            true,
        ],
        [
            "^/users/\\d+$",
            "/users/me",
            false,
        ],
        [
            "[",
            "[",
            false,
        ],
    ])("test_WhenSourceIs(%s)AndTextIs(%s)_ShouldReturn(%s)", (
        source,
        text,
        expected
    ) => {
        // Arrange
        const input = text;

        // Act
        const isMatch = RegexCache.test(source, input);

        // Assert
        expect(isMatch).toBe(expected);
    });
});
