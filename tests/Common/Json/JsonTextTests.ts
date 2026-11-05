import { describe, expect, test } from "vitest";
import { JsonText } from "../../../src/Common/Json/JsonText";

describe("JsonText", () => {
    test("format_WhenTextIsJson_ShouldIndentWithTwoSpaces", () => {
        // Arrange
        const text = "{\"id\":1,\"tags\":[\"a\"]}";

        // Act
        const formatted = JsonText.format(text);

        // Assert
        expect(formatted).toBe("{\n  \"id\": 1,\n  \"tags\": [\n    \"a\"\n  ]\n}");
    });

    test("format_WhenTextIsNotJson_ShouldReturnTextAsIs", () => {
        // Arrange
        const text = "<html>";

        // Act
        const formatted = JsonText.format(text);

        // Assert
        expect(formatted).toBe(text);
    });

    test("tryParse_WhenTextIsNotJson_ShouldFail", () => {
        // Arrange
        const text = "{broken";

        // Act
        const parsed = JsonText.tryParse(text);

        // Assert
        expect(parsed.hasErrors).toBe(true);
    });
});
