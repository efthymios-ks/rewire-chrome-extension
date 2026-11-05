import { describe, expect, test } from "vitest";
import { UrlRewrite } from "../../../../src/Common/Rules/Http/UrlRewrite";

describe("UrlRewrite", () => {
    test("trimBase_WhenBaseHasSpacesAndTrailingSlashes_ShouldTrimThem", () => {
        // Arrange
        const base = "  https://api.example.com/v1/// ";

        // Act
        const trimmed = UrlRewrite.trimBase(base);

        // Assert
        expect(trimmed).toBe("https://api.example.com/v1");
    });

    test.each([
        [
            "https://api.example.com/v1",
            true,
        ],
        [
            "https://api.example.com/v1/users",
            true,
        ],
        [
            "https://api.example.com/v1?page=2",
            true,
        ],
        [
            "https://api.example.com/v1#top",
            true,
        ],
        [
            "https://api.example.com/v10",
            false,
        ],
        [
            "https://api.example.com.evil.net/v1",
            false,
        ],
    ])("isUnderBase_WhenUrlIs(%s)_ShouldReturn(%s)", (url, expected) => {
        // Arrange
        const base = "https://api.example.com/v1/";

        // Act
        const isUnder = UrlRewrite.isUnderBase(url, base);

        // Assert
        expect(isUnder).toBe(expected);
    });

    test("isUnderBase_WhenBaseIsBlank_ShouldReturnFalse", () => {
        // Arrange
        const base = " / ";

        // Act
        const isUnder = UrlRewrite.isUnderBase("https://api.example.com", base);

        // Assert
        expect(isUnder).toBe(false);
    });

    test("replaceBase_WhenUrlIsUnderSource_ShouldKeepTheRestOfTheUrl", () => {
        // Arrange
        const url = "https://api.example.com/v1/users/42?expand=true";

        // Act
        const replaced = UrlRewrite.replaceBase(
            url,
            "https://api.example.com/v1/",
            "http://localhost:5000/"
        );
        const unrelated = UrlRewrite.replaceBase(
            "https://cdn.example.com/v1/app.js",
            "https://api.example.com/v1",
            "http://localhost:5000"
        );

        // Assert
        expect(replaced).toBe("http://localhost:5000/users/42?expand=true");
        expect(unrelated).toBeNull();
    });

    test("removeQueryParams_WhenPatternsUseWildcards_ShouldDropMatchingKeysOnly", () => {
        // Arrange
        const url = "https://api.example.com/users?utm_source=mail&page=2&utm_medium=email&fbclid=x";
        const patterns = [
            "utm_*",
            "fbclid",
        ];

        // Act
        const cleaned = UrlRewrite.removeQueryParams(url, patterns);

        // Assert
        expect(cleaned).toBe("https://api.example.com/users?page=2");
    });

    test("addOrReplaceQueryParams_WhenParamIsReplaceOnly_ShouldSkipItIfMissing", () => {
        // Arrange
        const url = "https://api.example.com/users?page=2";
        const params = [
            {
                key: "page",
                value: "3",
                replaceOnly: true,
            },
            {
                key: "debug",
                value: "1",
                replaceOnly: true,
            },
            {
                key: "lang",
                value: "en",
                replaceOnly: false,
            },
        ];

        // Act
        const updated = UrlRewrite.addOrReplaceQueryParams(url, params);

        // Assert
        expect(updated).toBe("https://api.example.com/users?page=3&lang=en");
    });

    test.each([
        [
            "http://api.example.com/users?page=2",
            "https://api.example.com/users?page=2",
        ],
        [
            "http://api.example.com:8080/users",
            "https://api.example.com:8080/users",
        ],
        [
            "https://api.example.com/users",
            "https://api.example.com/users",
        ],
        [
            "ws://api.example.com/socket",
            "ws://api.example.com/socket",
        ],
        [
            "not a url",
            "not a url",
        ],
    ])("upgradeScheme_WhenUrlIs(%s)_ShouldReturn(%s)", (url, expected) => {
        // Arrange
        const input = url;

        // Act
        const upgraded = UrlRewrite.upgradeScheme(input);

        // Assert
        expect(upgraded).toBe(expected);
    });

    test("removeQueryParams_WhenUrlIsInvalid_ShouldReturnItUnchanged", () => {
        // Arrange
        const url = "/relative?utm_source=mail";

        // Act
        const cleaned = UrlRewrite.removeQueryParams(url, ["utm_*"]);
        const updated = UrlRewrite.addOrReplaceQueryParams(url, []);

        // Assert
        expect(cleaned).toBe(url);
        expect(updated).toBe(url);
    });
});
