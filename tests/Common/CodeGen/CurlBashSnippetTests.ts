import { describe, expect, test } from "vitest";
import { CurlBashSnippet } from "../../../src/Common/CodeGen/CurlBashSnippet";
import type { SnippetOptions } from "../../../src/Common/CodeGen/RequestSnapshot";
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


describe("CurlBashSnippet", () => {
    test("toString_WhenEverythingIsIncluded_ShouldQuoteForPosixShells", () => {
        // Arrange
        const snapshot = aSnapshot();

        // Act
        const text = CurlBashSnippet.from(snapshot, Defaults).toString();

        // Assert
        expect(text).toBe([
            "curl 'https://api.example.com/users?tag=a&tag=b'",
            "  -H 'Content-Type: application/json'",
            "  -H 'X-Tenant: blue'",
            "  -b 'session=1; theme=dark'",
            "  --data-raw '{\"name\":\"O'\\''Neil\"}'",
        ].join(" \\\n"));
    });

    test.each([
        [
            "GET",
            null,
            "",
        ],
        [
            "GET",
            "q=1",
            "-X GET",
        ],
        [
            "POST",
            "q=1",
            "",
        ],
        [
            "POST",
            null,
            "-X POST",
        ],
        [
            "HEAD",
            null,
            "--head",
        ],
        [
            "PROPFIND",
            "<x/>",
            "-X PROPFIND",
        ],
    ])("toString_WhenMethodIs(%s)AndBodyIs(%s)_ShouldUseFlag(%s)", (
        method,
        body,
        expected
    ) => {
        // Arrange
        const snapshot = aSnapshot({
            method,
            body,
        });

        // Act
        const text = CurlBashSnippet.from(snapshot, Defaults).toString();

        // Assert
        const flags = text.split(" \\\n  ").filter(segment => segment.startsWith("-X") || segment === "--head");
        expect(flags.join(" ")).toBe(expected);
    });

    test("toString_WhenAcceptEncodingIsSent_ShouldAskCurlToDecompress", () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [header("Accept-Encoding", "gzip, deflate, br, zstd")],
        });

        // Act
        const text = CurlBashSnippet.from(snapshot, Defaults).toString();

        // Assert
        expect(text).toContain("--compressed");
        expect(text).not.toContain("Accept-Encoding");
    });

    test("toString_WhenTheBodyHasNonAsciiCharacters_ShouldPipeItThroughPrintf", () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [],
            body: "{\"name\":\"ü\"}",
        });

        // Act
        const text = CurlBashSnippet.from(snapshot, Defaults).toString();

        // Assert
        expect(text).toBe([
            "printf '%s' '{\"name\":\"ü\"}' | curl 'https://api.example.com/users?tag=a&tag=b'",
            "  --data-binary @-",
        ].join(" \\\n"));
    });

    test("toString_WhenTheBodyHasCarriageReturns_ShouldUseAnsiCQuoting", () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [],
            body: "a\r\nit's\\",
        });

        // Act
        const text = CurlBashSnippet.from(snapshot, Defaults).toString();

        // Assert
        expect(text).toContain("--data-raw $'a\\r\\nit\\'s\\\\'");
    });

    test("toString_WhenSomeHeadersCookiesAndParamsAreLeftOut_ShouldSendOnlyTheRest", () => {
        // Arrange
        const options: SnippetOptions = {
            ...Defaults,
            excludedHeaders: ["x-tenant"],
            excludedCookies: ["theme"],
            excludedQueryParams: ["tag"],
        };

        // Act
        const text = CurlBashSnippet.from(aSnapshot(), options).toString();

        // Assert
        expect(text).toContain("curl 'https://api.example.com/users'");
        expect(text).toContain("-H 'Content-Type: application/json'");
        expect(text).toContain("-b 'session=1'");
        expect(text).not.toContain("X-Tenant");
        expect(text).not.toContain("theme");
    });

    test("toString_WhenOptionsAreTheDefaults_ShouldLeaveOutTheCacheValidators", () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [
                header("If-None-Match", "W/\"6b80\""),
                header("If-Modified-Since", "Wed, 21 Oct 2015 07:28:00 GMT"),
                header("Accept", "application/json"),
            ],
        });

        // Act
        const text = CurlBashSnippet.from(snapshot, Defaults).toString();

        // Assert
        expect(text).not.toMatch(/If-None-Match|If-Modified-Since/);
        expect(text).toContain("-H 'Accept: application/json'");
    });

    test("toString_WhenEveryHeaderIsLeftOut_ShouldLeaveOutTheContentTypeToo", () => {
        // Arrange
        const options: SnippetOptions = {
            ...Defaults,
            excludedHeaders: [
                "content-type",
                "x-tenant",
            ],
        };

        // Act
        const text = CurlBashSnippet.from(aSnapshot(), options).toString();

        // Assert
        expect(text).not.toContain("Content-Type");
        expect(text).toContain("--data-raw");
    });

    test("toString_WhenTheBodyIsLeftOut_ShouldSendNoData", () => {
        // Arrange
        const options: SnippetOptions = {
            ...Defaults,
            includeBody: false,
        };

        // Act
        const text = CurlBashSnippet.from(aSnapshot(), options).toString();

        // Assert
        expect(text).not.toMatch(/--data/);
    });
    test("tryParse_WhenChromeCopiedTheCommand_ShouldReadEveryPart", () => {
        // Arrange
        const text = [
            "curl 'https://api.example.com/users' \\",
            "  -H 'accept: application/json' \\",
            "  -H 'content-type: application/json' \\",
            "  -b 'session=1' \\",
            "  --data-raw '{\"name\":\"Ada\"}'",
        ].join("\n");

        // Act
        const snippet = CurlBashSnippet.tryParse(text);

        // Assert
        expect(partsOf(snippet)).toEqual({
            method: "POST",
            url: "https://api.example.com/users",
            headers: [
                header("accept", "application/json"),
                header("content-type", "application/json"),
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
            "a non-ASCII body",
            aSnapshot({
                headers: [header("Content-Type", "text/plain")],
                body: "{\"name\":\"ü\"}",
            }),
        ],
        [
            "carriage returns",
            aSnapshot({
                headers: [header("Content-Type", "text/plain")],
                body: "a\r\nit's\\",
            }),
        ],
    ])("tryParse_WhenTheCommandWasMadeByRewireFrom(%s)_ShouldReadItBack", (_case, snapshot) => {
        // Arrange
        const made = CurlBashSnippet.from(snapshot, Defaults);

        // Act
        const parsed = CurlBashSnippet.tryParse(made.toString());

        // Assert
        expect(partsOf(parsed)).toEqual(partsOf(made));
    });

    test.each([
        "wget https://api.example.com/users",
        "hello world",
        "curl -X POST",
    ])("tryParse_WhenTheTextIsNoCurlRequest(%s)_ShouldReturnNull", text => {
        // Arrange
        const command = text;

        // Act
        const snippet = CurlBashSnippet.tryParse(command);

        // Assert
        expect(snippet).toBeNull();
    });

    test("toString_WhenTheBodyIsAMultipartForm_ShouldUseFormOptionsAndLeaveTheTypeToCurl", () => {
        // Arrange
        const snippet = CurlBashSnippet.from(aSnapshot(), Defaults);
        snippet.body = SnippetBodies.multipart([
            SnippetBodies.textPart("title", "Hello"),
            SnippetBodies.filePart(
                "avatar",
                "photo.png",
                "image/png"
            ),
        ]);

        // Act
        const text = snippet.toString();

        // Assert
        expect(text).toContain("-F 'title=Hello'");
        expect(text).toContain("-F 'avatar=@photo.png;type=image/png'");
        expect(text).not.toContain("Content-Type");
    });

    test("toString_WhenTheBodyIsAFile_ShouldSendItAsBinaryData", () => {
        // Arrange
        const snippet = CurlBashSnippet.from(aSnapshot(), Defaults);
        snippet.body = SnippetBodies.file("payload.bin");

        // Act
        const text = snippet.toString();

        // Assert
        expect(text).toContain("--data-binary '@payload.bin'");
    });

    test("method_WhenSetInLowerCase_ShouldStoreItInUpperCase", () => {
        // Arrange
        const snippet = CurlBashSnippet.from(aSnapshot(), Defaults);

        // Act
        snippet.method = "patch";

        // Assert
        expect(snippet.method).toBe("PATCH");
    });
});
