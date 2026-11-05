import { describe, expect, test } from "vitest";
import { UtcText } from "../../../../src/SidePanel/Core/Formatting/UtcText";

describe("UtcText", () => {
    test("of_WhenTheDateIsValid_ShouldPrintItAsIsoUtc", () => {
        // Arrange
        const date = new Date("2027-12-11T20:37:25+02:00");

        // Act
        const text = UtcText.of(date);

        // Assert
        expect(text).toBe("2027-12-11T18:37:25Z");
    });

    test("of_WhenTheDateIsInvalid_ShouldReturnEmpty", () => {
        // Arrange
        const date = new Date("not a date");

        // Act
        const text = UtcText.of(date);

        // Assert
        expect(text).toBe("");
    });

    test.each([
        [
            "Wed, 21 Oct 2026 07:28:00 GMT",
            "2026-10-21T07:28:00Z",
        ],
        [
            "2026-11-05T10:00:00.000Z",
            "2026-11-05T10:00:00Z",
        ],
        [
            "someday",
            "someday",
        ],
    ])("ofText_WhenTheTextIs(%s)_ShouldReturn(%s)", (input, expected) => {
        // Arrange
        const value = input;

        // Act
        const text = UtcText.ofText(value);

        // Assert
        expect(text).toBe(expected);
    });
});
