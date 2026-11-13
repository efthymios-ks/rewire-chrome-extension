import { describe, expect, test } from "vitest";
import { CspText } from "../../../src/Common/Http/CspText";

describe("CspText", () => {
    test.each([
        [
            "default-src 'self'; frame-ancestors 'none'",
            "default-src 'self'",
        ],
        [
            "FRAME-ANCESTORS https://a.example; script-src 'self';",
            "script-src 'self'",
        ],
        [
            "frame-ancestors 'self'",
            "",
        ],
        [
            "default-src 'self'; frame-ancestors 'none', frame-ancestors 'self'; img-src *",
            "default-src 'self', img-src *",
        ],
        [
            "img-src *",
            "img-src *",
        ],
    ])("withoutDirective_WhenThePolicyIs(%s)_ShouldReturn(%s)", (policy, expected) => {
        // Arrange
        const value = policy;

        // Act
        const cleaned = CspText.withoutDirective(value, "frame-ancestors");

        // Assert
        expect(cleaned).toBe(expected);
    });
});
