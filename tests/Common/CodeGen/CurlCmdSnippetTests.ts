import { describe, expect, test } from "vitest";
import { CurlCmdSnippet } from "../../../src/Common/CodeGen/CurlCmdSnippet";
import type { IRequestSnippet } from "../../../src/Common/CodeGen/IRequestSnippet";
import { SnippetBodies } from "../../../src/Common/CodeGen/SnippetBody";
import { aSnapshot, Defaults, header } from "./SnippetTestData";

function partsOf(snippet: IRequestSnippet | null): object | null {
    return snippet === null
        ? null
        : {
            method: snippet.method,
            url: snippet.url,
            headers: snippet.headers,
            cookies: snippet.cookies,
            body: snippet.body,
        };
}


describe("CurlCmdSnippet", () => {
    test("toString_WhenValuesHoldCmdCharacters_ShouldCaretEscapeThem", () => {
        // Arrange
        const snapshot = aSnapshot({
            url: "https://api.example.com/a?x=1&y=100%25",
            headers: [header("X-Quote", "say \"hi\" & 50%off")],
            body: null,
            method: "GET",
        });

        // Act
        const text = CurlCmdSnippet.from(snapshot, Defaults).toString();

        // Assert
        expect(text).toBe([
            "curl ^\"https://api.example.com/a?x=1^&y=100^%^25^\"",
            "  -H ^\"X-Quote: say ^\\^\"hi^\\^\" ^& 50^%^off^\"",
        ].join(" ^\n"));
    });

    test("toString_WhenAValueHasNonAsciiCharacters_ShouldSwitchTheConsoleToUtf8First", () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [],
            body: "€",
        });

        // Act
        const text = CurlCmdSnippet.from(snapshot, Defaults).toString();

        // Assert
        expect(text.split("\n")[0]).toBe("chcp 65001 >nul");
    });

    test("toString_WhenTheBodyHasLineBreaks_ShouldContinueTheStringAcrossLines", () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [],
            body: "a\nb",
        });

        // Act
        const text = CurlCmdSnippet.from(snapshot, Defaults).toString();

        // Assert
        expect(text).toContain("--data-raw ^\"a^\n\nb^\"");
    });

    test("tryParse_WhenChromeCopiedTheCommand_ShouldReadEveryPart", () => {
        // Arrange
        const text = [
            "curl ^\"https://api.example.com/users?x=1^&y=2^\" ^",
            "  -H ^\"accept: application/json^\" ^",
            "  -b ^\"session=1^\" ^",
            "  --data-raw ^\"^{^\\^\"name^\\^\":^\\^\"Ada^\\^\"^}^\"",
        ].join("\n");

        // Act
        const snippet = CurlCmdSnippet.tryParse(text);

        // Assert
        expect(partsOf(snippet)).toEqual({
            method: "POST",
            url: "https://api.example.com/users?x=1&y=2",
            headers: [
                header("accept", "application/json"),
                header("Content-Type", "application/x-www-form-urlencoded"),
            ],
            cookies: [
                {
                    name: "session",
                    value: "1",
                },
            ],
            body: SnippetBodies.text("{\"name\":\"Ada\"}"),
        });
    });

    test.each([
        [
            "the default request",
            aSnapshot(),
        ],
        [
            "cmd characters",
            aSnapshot({
                url: "https://api.example.com/a?x=1&y=100%25",
                headers: [header("X-Quote", "say \"hi\" & 50%off")],
                body: null,
                method: "GET",
            }),
        ],
        [
            "line breaks in the body",
            aSnapshot({
                headers: [header("Content-Type", "text/plain")],
                body: "a\nb",
            }),
        ],
        [
            "a non-ASCII body",
            aSnapshot({
                headers: [header("Content-Type", "text/plain")],
                body: "€",
            }),
        ],
    ])("tryParse_WhenTheCommandWasMadeByRewireFrom(%s)_ShouldReadItBack", (_case, snapshot) => {
        // Arrange
        const made = CurlCmdSnippet.from(snapshot, Defaults);

        // Act
        const parsed = CurlCmdSnippet.tryParse(made.toString());

        // Assert
        expect(partsOf(parsed)).toEqual(partsOf(made));
    });

    test("tryParse_WhenTheCommandIsWrittenForBash_ShouldReturnNull", () => {
        // Arrange
        const text = "curl 'https://api.example.com/users' \\\n  -H 'accept: */*'";

        // Act
        const snippet = CurlCmdSnippet.tryParse(text);

        // Assert
        expect(snippet).toBeNull();
    });
});
