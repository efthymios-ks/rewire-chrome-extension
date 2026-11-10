import { describe, expect, test } from "vitest";
import { ShellLines } from "../../../../src/Common/CodeGen/Parsing/ShellLines";

describe("ShellLines", () => {
    test.each([
        [
            "a ^\nb",
            2,
            true,
        ],
        [
            "a `  \nb",
            2,
            true,
        ],
        [
            "a\\\nb",
            1,
            false,
        ],
        [
            "a ^ b",
            2,
            false,
        ],
    ])("isStandaloneContinuation_WhenTheTextIs(%j)AtIndex(%s)_ShouldReturn(%s)", (
        text,
        index,
        expected
    ) => {
        // Arrange
        const command = text;

        // Act
        const isContinuation = ShellLines.isStandaloneContinuation(command, index);

        // Assert
        expect(isContinuation).toBe(expected);
    });

    test("normalize_WhenTheTextHasWindowsLineEndings_ShouldUseLineFeeds", () => {
        // Arrange
        const text = "a\r\nb\rc";

        // Act
        const normalized = ShellLines.normalize(text);

        // Assert
        expect(normalized).toBe("a\nb\nc");
    });
});
