import { describe, expect, test } from "vitest";
import { WgetOptionParser } from "../../../../src/Common/CodeGen/Parsing/WgetOptionParser";
import { SnippetBodies } from "../../../../src/Common/CodeGen/SnippetBody";

const Url = "https://api.example.com/users";

describe("WgetOptionParser", () => {
    test("parse_WhenTheCommandWasMadeByRewire_ShouldReadEveryPart", () => {
        // Arrange
        const args = [
            "--method=PUT",
            "--header=Content-Type: application/json",
            "--header=Cookie: session=1",
            "--body-data={\"a\":1}",
            "--content-on-error",
            "-O",
            "-",
            Url,
        ];

        // Act
        const request = WgetOptionParser.parse(args);

        // Assert
        expect(request).toEqual({
            method: "PUT",
            url: Url,
            headers: [
                {
                    name: "Content-Type",
                    value: "application/json",
                },
            ],
            cookies: [
                {
                    name: "session",
                    value: "1",
                },
            ],
            body: SnippetBodies.text("{\"a\":1}"),
        });
    });

    test.each([
        [
            "--post-data",
            "a=1",
            SnippetBodies.text("a=1"),
        ],
        [
            "--post-file",
            "data.bin",
            SnippetBodies.file("data.bin"),
        ],
    ])("parse_WhenTheBodyComesFrom(%s)_ShouldPost", (
        option,
        value,
        expected
    ) => {
        // Arrange
        const args = [
            option,
            value,
            Url,
        ];

        // Act
        const request = WgetOptionParser.parse(args);

        // Assert
        expect(request?.method).toBe("POST");
        expect(request?.body).toEqual(expected);
    });

    test("parse_WhenUserAndPasswordAreGiven_ShouldSendBasicAuthorization", () => {
        // Arrange
        const args = [
            "--user=ada",
            "--password=secret",
            "-q",
            Url,
        ];

        // Act
        const request = WgetOptionParser.parse(args);

        // Assert
        expect(request?.headers).toEqual([
            {
                name: "Authorization",
                value: "Basic YWRhOnNlY3JldA==",
            },
        ]);
    });

    test("parse_WhenNoUrlIsGiven_ShouldReturnNull", () => {
        // Arrange
        const args = [
            "-q",
            "--method=GET",
        ];

        // Act
        const request = WgetOptionParser.parse(args);

        // Assert
        expect(request).toBeNull();
    });
});
