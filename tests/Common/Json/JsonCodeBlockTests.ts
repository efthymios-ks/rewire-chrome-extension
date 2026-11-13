import { describe, expect, test } from "vitest";
import { JsonCodeBlock } from "../../../src/Common/Json/JsonCodeBlock";

describe("JsonCodeBlock", () => {
    test("of_WhenAnAnswerWrapsTheJsonInAFence_ShouldReturnOnlyTheJson", () => {
        // Arrange
        const answer = "Here are your rules:\n\n```json\n{\"schemaVersion\":5}\n```\n\nThe mock works on the inspected tab only.";

        // Act
        const json = JsonCodeBlock.of(answer);

        // Assert
        expect(json).toBe("{\"schemaVersion\":5}");
    });

    test("of_WhenTheFenceHasNoLanguage_ShouldStillReturnItsContent", () => {
        // Arrange
        const answer = "```\r\n{\"schemaVersion\":5}\r\n```";

        // Act
        const json = JsonCodeBlock.of(answer);

        // Assert
        expect(json).toBe("{\"schemaVersion\":5}");
    });

    test("of_WhenThereIsNoFence_ShouldReturnTheTrimmedText", () => {
        // Arrange
        const text = "  {\"schemaVersion\":5}\n";

        // Act
        const json = JsonCodeBlock.of(text);

        // Assert
        expect(json).toBe("{\"schemaVersion\":5}");
    });
});
