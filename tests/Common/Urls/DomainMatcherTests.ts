import { describe, expect, test } from "vitest";
import { DomainMatcher } from "../../../src/Common/Urls/DomainMatcher";

describe("DomainMatcher", () => {
    test.each([
        [
            "example.com",
            true,
        ],
        [
            "api.example.com",
            true,
        ],
        [
            "API.Example.com",
            true,
        ],
        [
            "notexample.com",
            false,
        ],
        [
            "example.com.evil.net",
            false,
        ],
    ])("matches_WhenHostIs(%s)_ShouldReturnExpected", (host, expected) => {
        // Arrange
        const domain = "example.com";

        // Act
        const isMatch = DomainMatcher.matches(host, domain);

        // Assert
        expect(isMatch).toBe(expected);
    });

    test("matchesAny_WhenNoDomainMatches_ShouldReturnFalse", () => {
        // Arrange
        const domains = [
            "auth.example.com",
            "localhost",
        ];

        // Act
        const isMatch = DomainMatcher.matchesAny("api.example.com", domains);

        // Assert
        expect(isMatch).toBe(false);
    });
});
