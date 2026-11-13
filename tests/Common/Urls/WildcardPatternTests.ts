import { describe, expect, test } from "vitest";
import { WildcardPattern } from "../../../src/Common/Urls/WildcardPattern";

describe("WildcardPattern", () => {
    test("matches_WhenPatternHasStar_ShouldMatchAnyPath", () => {
        // Arrange
        const pattern = "https://api.example.com/*";

        // Act
        const isMatch = WildcardPattern.matches(pattern, "https://api.example.com/api/v1/users/42");

        // Assert
        expect(isMatch).toBe(true);
    });

    test("matches_WhenPatternHasQuestionMark_ShouldMatchOneCharacter", () => {
        // Arrange
        const pattern = "https://api.example.com/v?/users";

        // Act
        const matchesOne = WildcardPattern.matches(pattern, "https://api.example.com/v1/users");
        const matchesTwo = WildcardPattern.matches(pattern, "https://api.example.com/v12/users");

        // Assert
        expect(matchesOne).toBe(true);
        expect(matchesTwo).toBe(false);
    });

    test("matches_WhenPatternHasDotsAndPlus_ShouldTreatRegexCharactersLiterally", () => {
        // Arrange
        const pattern = "https://api.example.com/a+b";

        // Act
        const isMatch = WildcardPattern.matches(pattern, "https://apiXexample.com/aab");

        // Assert
        expect(isMatch).toBe(false);
    });

    test("matches_WhenPatternIsEscapedUrlWithQuery_ShouldMatchExactUrl", () => {
        // Arrange
        const url = "https://api.example.com/orders?page=2&sort=*";
        const pattern = WildcardPattern.escape(url);

        // Act
        const matchesSelf = WildcardPattern.matches(pattern, url);
        const matchesOther = WildcardPattern.matches(pattern, "https://api.example.com/ordersXpage=2&sort=abc");

        // Assert
        expect(pattern).toBe("https://api.example.com/orders\\?page=2&sort=\\*");
        expect(matchesSelf).toBe(true);
        expect(matchesOther).toBe(false);
    });

    test("toRegexSource_WhenPatternHasStarAndQuestionMark_ShouldAnchorAndTranslateThem", () => {
        // Arrange
        const pattern = "https://api.example.com/v?/*";

        // Act
        const source = WildcardPattern.toRegexSource(pattern);

        // Assert
        expect(source).toBe("^https://api\\.example\\.com/v./.*$");
    });

    test("toRegexFragment_WhenPatternIsGiven_ShouldNotAnchor", () => {
        // Arrange
        const pattern = "*.example.com";

        // Act
        const fragment = WildcardPattern.toRegexFragment(pattern);

        // Assert
        expect(fragment).toBe(".*\\.example\\.com");
    });

    test("toRegexFragment_WhenPatternHasRegexCharacters_ShouldEscapeThem", () => {
        // Arrange
        const pattern = "/a+b(c)[d]{e}|f^g$h";

        // Act
        const fragment = WildcardPattern.toRegexFragment(pattern);

        // Assert
        expect(fragment).toBe("/a\\+b\\(c\\)\\[d\\]\\{e\\}\\|f\\^g\\$h");
        expect(new RegExp(`^${fragment}$`).test(pattern)).toBe(true);
    });

    test("toRegexFragment_WhenWildcardsAreEscaped_ShouldMatchThemLiterally", () => {
        // Arrange
        const pattern = "/files/\\*\\?\\\\";

        // Act
        const fragment = WildcardPattern.toRegexFragment(pattern);

        // Assert
        expect(fragment).toBe("/files/\\*\\?\\\\");
        expect(new RegExp(`^${fragment}$`).test("/files/*?\\")).toBe(true);
    });

    test("toRegexFragment_WhenPatternEndsWithLoneBackslash_ShouldDropIt", () => {
        // Arrange
        const pattern = "/files\\";

        // Act
        const fragment = WildcardPattern.toRegexFragment(pattern);

        // Assert
        expect(fragment).toBe("/files");
    });

    test("toRegexSource_WhenPatternIsEmpty_ShouldMatchOnlyEmptyText", () => {
        // Arrange
        const pattern = "";

        // Act
        const source = WildcardPattern.toRegexSource(pattern);

        // Assert
        expect(source).toBe("^$");
    });

    test("toRegexSource_WhenUrlIsEscapedFirst_ShouldMatchOnlyThatUrl", () => {
        // Arrange
        const url = "https://api.example.com/orders?page=2&sort=*";
        const source = WildcardPattern.toRegexSource(WildcardPattern.escape(url));

        // Act
        const regex = new RegExp(source);

        // Assert
        expect(regex.test(url)).toBe(true);
        expect(regex.test("https://api.example.com/orders?page=2&sort=name")).toBe(false);
    });

    test("toRegExp_WhenTextHasNewLines_ShouldLetStarSpanThem", () => {
        // Arrange
        const pattern = "first*last";

        // Act
        const regex = WildcardPattern.toRegExp(pattern);

        // Assert
        expect(regex.source).toBe(WildcardPattern.toRegexSource(pattern));
        expect(regex.test("first\nmiddle\nlast")).toBe(true);
    });

    test.each([
        "https://google.com/users/58",
        "http://google.com/users/58",
        "https://www.google.com/users/58",
        "https://mail.google.com/v2/accounts/users/58",
        "https://google.com/users/158",
        "https://google.com/users58",
        "https://notgoogle.com/users/58",
    ])("matches_WhenStarsSpanSchemeSubdomainAndPath(%s)_ShouldMatch", url => {
        // Arrange
        const pattern = "http*google.com*users*58";

        // Act
        const isMatch = WildcardPattern.matches(pattern, url);

        // Assert
        expect(isMatch).toBe(true);
    });

    test.each([
        "https://google.com/users/58?page=1",
        "https://google.com/users/59",
        "ftp://google.com/users/58",
        "https://google.org/users/58",
    ])("matches_WhenTheUrlDoesNotEndWith58OrMissesAPart(%s)_ShouldNotMatch", url => {
        // Arrange
        const pattern = "http*google.com*users*58";

        // Act
        const isMatch = WildcardPattern.matches(pattern, url);

        // Assert
        expect(isMatch).toBe(false);
    });

    test("toRegexSource_WhenStarsSurroundText_ShouldTurnEachStarIntoZeroOrMoreCharacters", () => {
        // Arrange
        const pattern = "http*google.com*users*58";

        // Act
        const source = WildcardPattern.toRegexSource(pattern);

        // Assert
        expect(source).toBe("^http.*google\\.com.*users.*58$");
    });

    test.each([
        [
            "page",
            false,
        ],
        [
            "utm_*",
            true,
        ],
        [
            "v?",
            true,
        ],
        [
            "a\\*b",
            false,
        ],
        [
            "a\\?b",
            false,
        ],
        [
            "a\\\\*",
            true,
        ],
        [
            "",
            false,
        ],
    ])("hasWildcards_WhenPatternIs(%s)_ShouldBe(%s)", (pattern, expected) => {
        // Arrange
        const text = pattern;

        // Act
        const hasWildcards = WildcardPattern.hasWildcards(text);

        // Assert
        expect(hasWildcards).toBe(expected);
    });

    test.each([
        [
            "page",
            "page",
        ],
        [
            "a\\*b",
            "a*b",
        ],
        [
            "a\\?b\\\\",
            "a?b\\",
        ],
        [
            "utm_*",
            "utm_*",
        ],
    ])("unescape_WhenPatternIs(%s)_ShouldGive(%s)", (pattern, expected) => {
        // Arrange
        const text = pattern;

        // Act
        const unescaped = WildcardPattern.unescape(text);

        // Assert
        expect(unescaped).toBe(expected);
    });

    test("unescape_WhenTextWasEscaped_ShouldGiveTheTextBack", () => {
        // Arrange
        const text = "https://api.example.com/search?q=a*b&x=\\";

        // Act
        const roundTrip = WildcardPattern.unescape(WildcardPattern.escape(text));

        // Assert
        expect(roundTrip).toBe(text);
    });
});
