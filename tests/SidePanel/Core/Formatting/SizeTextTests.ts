import { describe, expect, test } from "vitest";
import { SizeText } from "../../../../src/SidePanel/Core/Formatting/SizeText";

describe("SizeText", () => {
    test.each([
        [
            0,
            "0 B",
        ],
        [
            1023,
            "1023 B",
        ],
        [
            1536,
            "1.5 KB",
        ],
        [
            3_145_728,
            "3.0 MB",
        ],
    ])("of_WhenTheSizeIs(%s)_ShouldShow(%s)", (bytes, expected) => {
        // Arrange
        const size = bytes;

        // Act
        const text = SizeText.of(size);

        // Assert
        expect(text).toBe(expected);
    });
});
