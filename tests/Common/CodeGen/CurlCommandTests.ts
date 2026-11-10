import { describe, expect, test } from "vitest";
import { CurlCommand, type CurlDialect } from "../../../src/Common/CodeGen/CurlCommand";
import { SnippetBodies } from "../../../src/Common/CodeGen/SnippetBody";
import type { SnippetRequest } from "../../../src/Common/CodeGen/SnippetRequest";

const Dialect: CurlDialect = {
    lineContinuation: " | ",
    quote: value => `[${value}]`,
    textBody: text => ({
        pipe: null,
        argument: `--data-raw [${text}]`,
    }),
    preamble: () => null,
};

function aRequest(changes: Partial<SnippetRequest> = {}): SnippetRequest {
    return {
        method: "GET",
        url: "https://api.example.com/users",
        headers: [],
        cookies: [],
        body: SnippetBodies.none(),
        ...changes,
    };
}

describe("CurlCommand", () => {
    test("render_WhenTheRequestHasHeadersCookiesAndText_ShouldUseTheDialect", () => {
        // Arrange
        const request = aRequest({
            method: "POST",
            headers: [
                {
                    name: "Accept",
                    value: "*/*",
                },
            ],
            cookies: [
                {
                    name: "a",
                    value: "1",
                },
            ],
            body: SnippetBodies.text("x=1"),
        });

        // Act
        const text = CurlCommand.render(request, Dialect);

        // Assert
        expect(text).toBe("curl [https://api.example.com/users] | -H [Accept: */*] | -b [a=1] | --data-raw [x=1]");
    });

    test("render_WhenAFieldLooksLikeAFile_ShouldSendItAsAPlainString", () => {
        // Arrange
        const request = aRequest({
            body: SnippetBodies.multipart([SnippetBodies.textPart("handle", "@ada")]),
        });

        // Act
        const text = CurlCommand.render(request, Dialect);

        // Assert
        expect(text).toContain("--form-string [handle=@ada]");
    });

    test("render_WhenTheBodyIsMultipart_ShouldLeaveTheContentTypeToCurl", () => {
        // Arrange
        const request = aRequest({
            method: "POST",
            headers: [
                {
                    name: "Content-Type",
                    value: "multipart/form-data; boundary=x",
                },
            ],
            body: SnippetBodies.multipart([SnippetBodies.textPart("title", "Hello")]),
        });

        // Act
        const text = CurlCommand.render(request, Dialect);

        // Assert
        expect(text).toBe("curl [https://api.example.com/users] | -F [title=Hello]");
    });

    test("render_WhenTheDialectHasAPreamble_ShouldPutItOnTheFirstLine", () => {
        // Arrange
        const dialect: CurlDialect = {
            ...Dialect,
            preamble: () => "chcp 65001 >nul",
        };

        // Act
        const text = CurlCommand.render(aRequest(), dialect);

        // Assert
        expect(text.split("\n")).toEqual([
            "chcp 65001 >nul",
            "curl [https://api.example.com/users]",
        ]);
    });
});
