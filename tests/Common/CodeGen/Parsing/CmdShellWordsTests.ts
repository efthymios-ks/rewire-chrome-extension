import { describe, expect, test } from "vitest";
import { CmdShellWords } from "../../../../src/Common/CodeGen/Parsing/CmdShellWords";

describe("CmdShellWords", () => {
    test.each([
        [
            "caret quoted values",
            "curl ^\"https://a.test/?x=1^&y=2^\" -H ^\"A: say ^\\^\"hi^\\^\"^\"",
            [
                "curl",
                "https://a.test/?x=1&y=2",
                "-H",
                "A: say \"hi\"",
            ],
        ],
        [
            "plain double quotes",
            "curl \"https://a.test\" -H \"A: 1 & 2\"",
            [
                "curl",
                "https://a.test",
                "-H",
                "A: 1 & 2",
            ],
        ],
        [
            "doubled quotes inside quotes",
            "curl -d \"{\"\"a\"\":1}\"",
            [
                "curl",
                "-d",
                "{\"a\":1}",
            ],
        ],
        [
            "backslashes before quotes",
            "x \"a\\\\\" \"b\\\"c\"",
            [
                "x",
                "a\\",
                "b\"c",
            ],
        ],
        [
            "escaped percent signs",
            "curl ^\"https://a.test/?q=100^%^25^\"",
            [
                "curl",
                "https://a.test/?q=100%25",
            ],
        ],
    ])("split_WhenTheTextUses(%s)_ShouldReadTheArguments", (
        _case,
        text,
        expected
    ) => {
        // Arrange
        const command = text;

        // Act
        const words = CmdShellWords.split(command);

        // Assert
        expect(words).toEqual(expected);
    });

    test.each([
        [
            "caret",
            "curl ^\"https://a.test^\" ^\n  -H ^\"A: 1^\"",
        ],
        [
            "backslash",
            "curl \"https://a.test\" \\\n  -H \"A: 1\"",
        ],
        [
            "backtick",
            "curl \"https://a.test\" `\n  -H \"A: 1\"",
        ],
        [
            "bare line break",
            "curl \"https://a.test\"\n  -H \"A: 1\"",
        ],
        [
            "Windows line endings",
            "curl ^\"https://a.test^\" ^\r\n  -H ^\"A: 1^\"",
        ],
    ])("split_WhenLinesContinueWith(%s)_ShouldJoinThem", (_case, text) => {
        // Arrange
        const command = text;

        // Act
        const words = CmdShellWords.split(command);

        // Assert
        expect(words).toEqual([
            "curl",
            "https://a.test",
            "-H",
            "A: 1",
        ]);
    });

    test("split_WhenACaretEscapesALineBreakInsideAValue_ShouldKeepTheLineBreak", () => {
        // Arrange
        const command = "curl --data-raw ^\"a^\n\nb^\"";

        // Act
        const words = CmdShellWords.split(command);

        // Assert
        expect(words).toEqual([
            "curl",
            "--data-raw",
            "a\nb",
        ]);
    });
});
