import { describe, expect, test } from "vitest";
import { ShellQuoting } from "../../../src/Common/CodeGen/ShellQuoting";

describe("ShellQuoting", () => {
    test.each([
        [
            "a\\b",
            "^\"a^\\b^\"",
        ],
        [
            "a\\\"b",
            "^\"a^\\^\\^\\^\"b^\"",
        ],
        [
            "end\\",
            "^\"end^\\^\\^\"",
        ],
    ])("cmd_WhenBackslashesAppear(%s)_ShouldDoubleOnlyThoseBeforeAQuote", (value, expected) => {
        // Arrange
        const input = value;

        // Act
        const quoted = ShellQuoting.cmd(input);

        // Assert
        expect(quoted).toBe(expected);
    });
});
