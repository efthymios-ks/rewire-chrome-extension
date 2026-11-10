import { describe, expect, test } from "vitest";
import { RequestLines } from "../../../../src/Common/CodeGen/Parsing/RequestLines";

describe("RequestLines", () => {
    test.each([
        [
            [
                "chcp",
                "65001",
                ">nul",
                "curl",
                "https://a.test",
            ],
            3,
        ],
        [
            [
                "/usr/bin/curl",
                "https://a.test",
            ],
            0,
        ],
        [
            [
                "C:\\Tools\\curl.exe",
                "https://a.test",
            ],
            0,
        ],
        [
            [
                "wget",
                "https://a.test",
            ],
            -1,
        ],
    ])("commandIndex_WhenTheWordsAre(%j)_ShouldFindCurlAt(%s)", (words, expected) => {
        // Arrange
        const command = "curl";

        // Act
        const index = RequestLines.commandIndex(words, command);

        // Assert
        expect(index).toBe(expected);
    });

    test("argumentsAfter_WhenTheCommandIsPipedOn_ShouldStopAtThePipe", () => {
        // Arrange
        const words = [
            "curl",
            "https://a.test",
            "-s",
            "|",
            "jq",
            ".",
        ];

        // Act
        const args = RequestLines.argumentsAfter(words, 0);

        // Assert
        expect(args).toEqual([
            "https://a.test",
            "-s",
        ]);
    });

    test.each([
        [
            "api.example.com/users",
            "http://api.example.com/users",
        ],
        [
            "https://api.example.com/users",
            "https://api.example.com/users",
        ],
    ])("withScheme_WhenTheUrlIs(%s)_ShouldReturn(%s)", (url, expected) => {
        // Arrange
        const value = url;

        // Act
        const result = RequestLines.withScheme(value);

        // Assert
        expect(result).toBe(expected);
    });

    test.each([
        [
            "\"photo.png\"",
            "photo.png",
        ],
        [
            "'photo.png'",
            "photo.png",
        ],
        [
            "photo.png",
            "photo.png",
        ],
    ])("unquote_WhenTheValueIs(%s)_ShouldReturn(%s)", (value, expected) => {
        // Arrange
        const text = value;

        // Act
        const result = RequestLines.unquote(text);

        // Assert
        expect(result).toBe(expected);
    });
});
