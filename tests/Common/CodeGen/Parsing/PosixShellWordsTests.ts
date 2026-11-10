import { describe, expect, test } from "vitest";
import { PosixShellWords } from "../../../../src/Common/CodeGen/Parsing/PosixShellWords";

describe("PosixShellWords", () => {
    test.each([
        [
            "plain words",
            "curl https://a.test -s",
            [
                "curl",
                "https://a.test",
                "-s",
            ],
        ],
        [
            "single quotes",
            "curl 'a b' 'it'\\''s'",
            [
                "curl",
                "a b",
                "it's",
            ],
        ],
        [
            "double quotes with escapes",
            "echo \"say \\\"hi\\\" \\$HOME \\x\"",
            [
                "echo",
                "say \"hi\" $HOME \\x",
            ],
        ],
        [
            "ANSI-C quoting",
            "printf $'a\\r\\nit\\'s\\\\ \\x41\\u00fc\\101'",
            [
                "printf",
                "a\r\nit's\\ AüA",
            ],
        ],
        [
            "backslash outside quotes",
            "a\\ b c\\'d",
            [
                "a b",
                "c'd",
            ],
        ],
        [
            "quotes glued to text",
            "--header='X: 1'",
            [
                "--header=X: 1",
            ],
        ],
    ])("split_WhenTheTextUses(%s)_ShouldReadTheWords", (
        _case,
        text,
        expected
    ) => {
        // Arrange
        const command = text;

        // Act
        const words = PosixShellWords.split(command);

        // Assert
        expect(words).toEqual(expected);
    });

    test.each([
        [
            "backslash",
            "curl 'https://a.test' \\\n  -H 'A: 1'",
        ],
        [
            "caret",
            "curl 'https://a.test' ^\n  -H 'A: 1'",
        ],
        [
            "backtick",
            "curl 'https://a.test' `\n  -H 'A: 1'",
        ],
        [
            "bare line break",
            "curl 'https://a.test'\n  -H 'A: 1'",
        ],
        [
            "Windows line endings",
            "curl 'https://a.test' \\\r\n  -H 'A: 1'",
        ],
    ])("split_WhenLinesContinueWith(%s)_ShouldJoinThem", (_case, text) => {
        // Arrange
        const command = text;

        // Act
        const words = PosixShellWords.split(command);

        // Assert
        expect(words).toEqual([
            "curl",
            "https://a.test",
            "-H",
            "A: 1",
        ]);
    });

    test("split_WhenAQuotedValueSpansLines_ShouldKeepTheLineBreak", () => {
        // Arrange
        const command = "curl --data-raw 'a\nb'";

        // Act
        const words = PosixShellWords.split(command);

        // Assert
        expect(words).toEqual([
            "curl",
            "--data-raw",
            "a\nb",
        ]);
    });

    test("split_WhenALineIsAComment_ShouldSkipIt", () => {
        // Arrange
        const command = "# copied from the docs\ncurl https://a.test";

        // Act
        const words = PosixShellWords.split(command);

        // Assert
        expect(words).toEqual([
            "curl",
            "https://a.test",
        ]);
    });

    test.each([
        "curl 'https://a.test",
        "curl \"https://a.test",
        "curl $'https://a.test",
    ])("split_WhenAQuoteIsNeverClosed(%s)_ShouldReturnNull", text => {
        // Arrange
        const command = text;

        // Act
        const words = PosixShellWords.split(command);

        // Assert
        expect(words).toBeNull();
    });
});
