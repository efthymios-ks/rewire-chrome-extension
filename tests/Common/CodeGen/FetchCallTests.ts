import { describe, expect, test } from "vitest";
import { FetchCall, type FetchDialect } from "../../../src/Common/CodeGen/FetchCall";
import { SnippetBodies } from "../../../src/Common/CodeGen/SnippetBody";
import type { SnippetRequest } from "../../../src/Common/CodeGen/SnippetRequest";

const Dialect: FetchDialect = {
    headersOf: request => request.headers,
    extraOptions: () => [],
    fileExpression: fileName => `file(${JSON.stringify(fileName)})`,
    preamble: () => [],
};

function aRequest(changes: Partial<SnippetRequest> = {}): SnippetRequest {
    return {
        method: "POST",
        url: "https://api.example.com/upload",
        headers: [],
        cookies: [],
        body: SnippetBodies.none(),
        ...changes,
    };
}

describe("FetchCall", () => {
    test("render_WhenTheBodyIsAFile_ShouldUseTheDialectFileExpression", () => {
        // Arrange
        const request = aRequest({
            body: SnippetBodies.file("payload.bin"),
        });

        // Act
        const text = FetchCall.render(request, Dialect);

        // Assert
        expect(text).toBe([
            "await fetch(\"https://api.example.com/upload\", {",
            "    method: \"POST\",",
            "    body: file(\"payload.bin\"),",
            "});",
        ].join("\n"));
    });

    test("render_WhenTheMethodTakesNoBody_ShouldSkipTheFormToo", () => {
        // Arrange
        const request = aRequest({
            method: "GET",
            body: SnippetBodies.multipart([SnippetBodies.textPart("title", "Hello")]),
        });

        // Act
        const text = FetchCall.render(request, Dialect);

        // Assert
        expect(text).not.toContain("FormData");
        expect(text).not.toContain("body:");
    });

    test.each([
        [
            SnippetBodies.file("a.bin"),
            true,
        ],
        [
            SnippetBodies.multipart([
                SnippetBodies.filePart(
                    "avatar",
                    "a.png",
                    ""
                ),
            ]),
            true,
        ],
        [
            SnippetBodies.multipart([SnippetBodies.textPart("title", "Hello")]),
            false,
        ],
        [
            SnippetBodies.text("x"),
            false,
        ],
    ])("usesFiles_WhenTheBodyIs(%j)_ShouldReturn(%s)", (body, expected) => {
        // Arrange
        const value = body;

        // Act
        const usesFiles = FetchCall.usesFiles(value);

        // Assert
        expect(usesFiles).toBe(expected);
    });
});
