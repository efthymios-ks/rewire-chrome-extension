import { describe, expect, test } from "vitest";
import { PowerShellSnippet } from "../../../src/Common/CodeGen/PowerShellSnippet";
import { SnippetBodies } from "../../../src/Common/CodeGen/SnippetBody";
import { aSnapshot, Defaults, header } from "./SnippetTestData";

describe("PowerShellSnippet", () => {
    test("toString_WhenEverythingIsIncluded_ShouldSplatParametersAndPrintStatusHeadersAndContent", () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [
                header("Content-Type", "application/json"),
                header("User-Agent", "Mozilla/5.0"),
                header("Accept-Encoding", "gzip"),
                header("X-Tenant", "blue"),
                header("Cookie", "session=1"),
            ],
        });

        // Act
        const text = PowerShellSnippet.from(snapshot, Defaults).toString();

        // Assert
        expect(text).toBe([
            "& {",
            "    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession",
            "    $session.Cookies.Add((New-Object System.Net.Cookie('session', '1', '/', 'api.example.com')))",
            "    $parameters = @{",
            "        Uri = 'https://api.example.com/users?tag=a&tag=b'",
            "        Method = 'Post'",
            "        WebSession = $session",
            "        Headers = @{",
            "            'X-Tenant' = 'blue'",
            "        }",
            "        UserAgent = 'Mozilla/5.0'",
            "        ContentType = 'application/json'",
            "        Body = [System.Text.Encoding]::UTF8.GetBytes('{\"name\":\"O''Neil\"}')",
            "        UseBasicParsing = $true",
            "    }",
            "    if ($PSVersionTable.PSVersion.Major -ge 7) {",
            "        $parameters.SkipHttpErrorCheck = $true",
            "    }",
            "    $response = Invoke-WebRequest @parameters",
            "    \"Status: $($response.StatusCode) $($response.StatusDescription)\"",
            "    $response.Headers.GetEnumerator() | ForEach-Object { \"$($_.Key): $($_.Value -join ', ')\" }",
            "    \"\"",
            "    $response.Content",
            "}",
        ].join("\n"));
        expect(text).not.toContain("`\n");
    });

    test.each([
        [
            "GET",
            "Method = 'Get'",
        ],
        [
            "MERGE",
            "Method = 'Merge'",
        ],
        [
            "PROPFIND",
            "CustomMethod = 'PROPFIND'",
        ],
    ])("toString_WhenMethodIs(%s)_ShouldPass(%s)", (method, expected) => {
        // Arrange
        const snapshot = aSnapshot({
            method,
        });

        // Act
        const text = PowerShellSnippet.from(snapshot, Defaults).toString();

        // Assert
        expect(text).toContain(expected);
    });

    test("toString_WhenTheBodyHasLineBreaks_ShouldBuildThemExplicitly", () => {
        // Arrange
        const snapshot = aSnapshot({
            body: "a\r\nb\nc",
        });

        // Act
        const text = PowerShellSnippet.from(snapshot, Defaults).toString();

        // Assert
        expect(text).toContain("GetBytes(('a' + \"`r`n\" + 'b' + \"`n\" + 'c'))");
    });

    test("toString_WhenTheMethodHasNoBody_ShouldLeaveTheBodyOut", () => {
        // Arrange
        const snapshot = aSnapshot({
            method: "GET",
        });

        // Act
        const text = PowerShellSnippet.from(snapshot, Defaults).toString();

        // Assert
        expect(text).not.toContain("Body = ");
    });

    test("toString_WhenTheBodyHoldsSmartQuotes_ShouldDoubleThem", () => {
        // Arrange
        const snapshot = aSnapshot({
            body: "it\u2019s",
        });

        // Act
        const text = PowerShellSnippet.from(snapshot, Defaults).toString();

        // Assert
        expect(text).toContain("GetBytes('it\u2019\u2019s')");
    });

    test("tryParse_WhenGivenAnyText_ShouldReturnNull", () => {
        // Arrange
        const text = "Invoke-WebRequest -Uri 'https://api.example.com/users'";

        // Act
        const snippet = PowerShellSnippet.tryParse(text);

        // Assert
        expect(snippet).toBeNull();
    });

    test("toString_WhenTheBodyIsAFile_ShouldPassItAsInFile", () => {
        // Arrange
        const snippet = PowerShellSnippet.from(aSnapshot(), Defaults);
        snippet.body = SnippetBodies.file("payload.bin");

        // Act
        const text = snippet.toString();

        // Assert
        expect(text).toContain("InFile = 'payload.bin'");
        expect(text).not.toContain("Body = ");
    });

    test("toString_WhenTheBodyIsAMultipartForm_ShouldPassAFormAndNoContentType", () => {
        // Arrange
        const snippet = PowerShellSnippet.from(aSnapshot(), Defaults);
        snippet.body = SnippetBodies.multipart([
            SnippetBodies.textPart("title", "Hello"),
            SnippetBodies.filePart(
                "avatar",
                "photo.png",
                ""
            ),
        ]);

        // Act
        const text = snippet.toString();

        // Assert
        expect(text).toContain("'title' = 'Hello'");
        expect(text).toContain("'avatar' = Get-Item -LiteralPath 'photo.png'");
        expect(text).not.toContain("ContentType = ");
    });
});
