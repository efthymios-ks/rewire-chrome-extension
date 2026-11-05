import { describe, expect, test } from "vitest";
import { CurlCmdSnippet } from "../../../src/Common/CodeGen/CurlCmdSnippet";
import { CurlSnippet } from "../../../src/Common/CodeGen/CurlSnippet";
import { FetchNodeSnippet } from "../../../src/Common/CodeGen/FetchNodeSnippet";
import { FetchSnippet } from "../../../src/Common/CodeGen/FetchSnippet";
import { PowerShellSnippet } from "../../../src/Common/CodeGen/PowerShellSnippet";
import { DefaultSnippetParts, type RequestSnapshot, type SnippetOptions } from "../../../src/Common/CodeGen/RequestSnapshot";
import { SnippetGenerators } from "../../../src/Common/CodeGen/SnippetGenerators";
import { SnippetParts } from "../../../src/Common/CodeGen/SnippetParts";
import { WgetSnippet } from "../../../src/Common/CodeGen/WgetSnippet";
import type { HeaderEntry } from "../../../src/Contracts/Timeline/HeaderEntry";

const Defaults: SnippetOptions = DefaultSnippetParts;

function header(name: string, value: string): HeaderEntry {
    return {
        name,
        value,
    };
}

function aSnapshot(overrides: Partial<RequestSnapshot> = {}): RequestSnapshot {
    return {
        method: "POST",
        url: "https://api.example.com/users?tag=a&tag=b",
        headers: [
            header("Content-Type", "application/json"),
            header("X-Tenant", "blue"),
            header("Cookie", "session=1"),
            header("Cookie", "theme=dark"),
            header(":authority", "api.example.com"),
            header("Content-Length", "13"),
            header("Host", "api.example.com"),
            header("Connection", "keep-alive"),
        ],
        body: "{\"name\":\"O'Neil\"}",
        ...overrides,
    };
}

const MethodCases = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
    "PROPFIND",
];

const FormCases = [
    [
        "application/x-www-form-urlencoded",
        "a=1&b=hello+world&c=%26%3D",
    ],
    [
        "multipart/form-data; boundary=----Boundary7",
        "------Boundary7\r\nContent-Disposition: form-data; name=\"title\"\r\n\r\nHello\r\n------Boundary7--\r\n",
    ],
    [
        "text/plain",
        "plain text",
    ],
    [
        "application/xml",
        "<a b=\"1\"/>",
    ],
];

describe("SnippetGenerators forms and media types", () => {
    test.each(FormCases.flatMap(([contentType, body]) => SnippetGenerators.all().map(generator => [
        generator.id,
        contentType,
        body,
    ])))("generate_WhenGenerator(%s)SendsContentType(%s)_ShouldKeepTheTypeAndTheBody", (
        generatorId,
        contentType,
        body
    ) => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [header("Content-Type", contentType!)],
            body: body!,
        });

        // Act
        const text = SnippetGenerators.get(generatorId!).generate(snapshot, Defaults);

        // Assert
        expect(text).toContain(contentType!.split(";")[0]);
        expect(text).toMatch(/--data-raw|--data-binary|--body-data|body:|Body = /);
    });
});

describe("CurlSnippet", () => {
    const snippet = new CurlSnippet();

    test("generate_WhenEverythingIsIncluded_ShouldQuoteForPosixShells", () => {
        // Arrange
        const snapshot = aSnapshot();

        // Act
        const text = snippet.generate(snapshot, Defaults);

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
    ])("generate_WhenMethodIs(%s)AndBodyIs(%s)_ShouldUseFlag(%s)", (
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
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        const flags = text.split(" \\\n  ").filter(segment => segment.startsWith("-X") || segment === "--head");
        expect(flags.join(" ")).toBe(expected);
    });

    test("generate_WhenAcceptEncodingIsSent_ShouldAskCurlToDecompress", () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [header("Accept-Encoding", "gzip, deflate, br, zstd")],
        });

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text).toContain("--compressed");
        expect(text).not.toContain("Accept-Encoding");
    });

    test("generate_WhenTheBodyHasNonAsciiCharacters_ShouldPipeItThroughPrintf", () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [],
            body: "{\"name\":\"ü\"}",
        });

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text).toBe([
            "printf '%s' '{\"name\":\"ü\"}' | curl 'https://api.example.com/users?tag=a&tag=b'",
            "  --data-binary @-",
        ].join(" \\\n"));
    });

    test("generate_WhenTheBodyHasCarriageReturns_ShouldUseAnsiCQuoting", () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [],
            body: "a\r\nit's\\",
        });

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text).toContain("--data-raw $'a\\r\\nit\\'s\\\\'");
    });

    test("generate_WhenSomeHeadersCookiesAndParamsAreLeftOut_ShouldSendOnlyTheRest", () => {
        // Arrange
        const options: SnippetOptions = {
            ...Defaults,
            excludedHeaders: ["x-tenant"],
            excludedCookies: ["theme"],
            excludedQueryParams: ["tag"],
        };

        // Act
        const text = snippet.generate(aSnapshot(), options);

        // Assert
        expect(text).toContain("curl 'https://api.example.com/users'");
        expect(text).toContain("-H 'Content-Type: application/json'");
        expect(text).toContain("-b 'session=1'");
        expect(text).not.toContain("X-Tenant");
        expect(text).not.toContain("theme");
    });

    test("generate_WhenOptionsAreTheDefaults_ShouldLeaveOutTheCacheValidators", () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [
                header("If-None-Match", "W/\"6b80\""),
                header("If-Modified-Since", "Wed, 21 Oct 2015 07:28:00 GMT"),
                header("Accept", "application/json"),
            ],
        });

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text).not.toMatch(/If-None-Match|If-Modified-Since/);
        expect(text).toContain("-H 'Accept: application/json'");
    });

    test("generate_WhenEveryHeaderIsLeftOut_ShouldLeaveOutTheContentTypeToo", () => {
        // Arrange
        const options: SnippetOptions = {
            ...Defaults,
            excludedHeaders: [
                "content-type",
                "x-tenant",
            ],
        };

        // Act
        const text = snippet.generate(aSnapshot(), options);

        // Assert
        expect(text).not.toContain("Content-Type");
        expect(text).toContain("--data-raw");
    });

    test("generate_WhenTheBodyIsLeftOut_ShouldSendNoData", () => {
        // Arrange
        const options: SnippetOptions = {
            ...Defaults,
            includeBody: false,
        };

        // Act
        const text = snippet.generate(aSnapshot(), options);

        // Assert
        expect(text).not.toMatch(/--data/);
    });
});

describe("CurlCmdSnippet", () => {
    const snippet = new CurlCmdSnippet();

    test("generate_WhenValuesHoldCmdCharacters_ShouldCaretEscapeThem", () => {
        // Arrange
        const snapshot = aSnapshot({
            url: "https://api.example.com/a?x=1&y=100%25",
            headers: [header("X-Quote", "say \"hi\" & 50%off")],
            body: null,
            method: "GET",
        });

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text).toBe([
            "curl ^\"https://api.example.com/a?x=1^&y=100^%^25^\"",
            "  -H ^\"X-Quote: say ^\\^\"hi^\\^\" ^& 50^%^off^\"",
        ].join(" ^\n"));
    });

    test("generate_WhenAValueHasNonAsciiCharacters_ShouldSwitchTheConsoleToUtf8First", () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [],
            body: "€",
        });

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text.split("\n")[0]).toBe("chcp 65001 >nul");
    });

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
    ])("cmdQuote_WhenBackslashesAppear(%s)_ShouldDoubleOnlyThoseBeforeAQuote", (value, expected) => {
        // Arrange
        const input = value;

        // Act
        const quoted = SnippetParts.cmdQuote(input);

        // Assert
        expect(quoted).toBe(expected);
    });

    test("generate_WhenTheBodyHasLineBreaks_ShouldContinueTheStringAcrossLines", () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [],
            body: "a\nb",
        });

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text).toContain("--data-raw ^\"a^\n\nb^\"");
    });
});

describe("WgetSnippet", () => {
    const snippet = new WgetSnippet();

    test("generate_WhenEverythingIsIncluded_ShouldPrintTheBodyToStandardOutput", () => {
        // Arrange
        const snapshot = aSnapshot();

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text).toBe([
            "wget",
            "  --method=POST",
            "  --header='Content-Type: application/json'",
            "  --header='X-Tenant: blue'",
            "  --header='Cookie: session=1; theme=dark'",
            "  --body-data='{\"name\":\"O'\\''Neil\"}'",
            "  --content-on-error",
            "  -O -",
            "  'https://api.example.com/users?tag=a&tag=b'",
        ].join(" \\\n"));
    });

    test.each([
        [
            "GET",
            null,
            false,
        ],
        [
            "GET",
            "q=1",
            true,
        ],
        [
            "DELETE",
            null,
            true,
        ],
    ])("generate_WhenMethodIs(%s)AndBodyIs(%s)_ShouldNameTheMethod(%s)", (
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
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text.includes(`--method=${method}`)).toBe(expected);
    });
});

describe("FetchSnippet", () => {
    const snippet = new FetchSnippet();

    test("generate_WhenCookiesAreIncluded_ShouldSendCredentialsInsteadOfACookieHeader", () => {
        // Arrange
        const snapshot = aSnapshot();

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text).toBe([
            "await fetch(\"https://api.example.com/users?tag=a&tag=b\", {",
            "    method: \"POST\",",
            "    headers: {",
            "        \"Content-Type\": \"application/json\",",
            "        \"X-Tenant\": \"blue\"",
            "    },",
            "    body: \"{\\\"name\\\":\\\"O'Neil\\\"}\",",
            "    credentials: \"include\",",
            "});",
        ].join("\n"));
    });

    test("generate_WhenForbiddenHeadersWereCaptured_ShouldLeaveThemOutAndKeepTheReferrer", () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [
                header("Accept", "application/json"),
                header("Accept-Encoding", "gzip"),
                header("User-Agent", "Mozilla/5.0"),
                header("Origin", "https://app.example.com"),
                header("Referer", "https://app.example.com/users"),
                header("Sec-Fetch-Mode", "cors"),
            ],
        });

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text).toContain("\"Accept\": \"application/json\"");
        expect(text).not.toMatch(/Accept-Encoding|User-Agent|Origin|Sec-Fetch|"Referer"/);
        expect(text).toContain("referrer: \"https://app.example.com/users\",");
        expect(text).toContain("credentials: \"omit\",");
    });

    test.each([
        "GET",
        "HEAD",
    ])("generate_WhenMethodIs(%s)_ShouldLeaveTheBodyOut", method => {
        // Arrange
        const snapshot = aSnapshot({
            method,
        });

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text).not.toContain("body:");
    });
});

describe("FetchNodeSnippet", () => {
    const snippet = new FetchNodeSnippet();

    test("generate_WhenCookiesAreIncluded_ShouldSendThemAsAHeader", () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [
                header("Accept-Encoding", "gzip"),
                header("User-Agent", "Mozilla/5.0"),
                header("Cookie", "session=1"),
            ],
        });

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text).toContain("\"User-Agent\": \"Mozilla/5.0\",");
        expect(text).toContain("\"Cookie\": \"session=1\"");
        expect(text).not.toContain("Accept-Encoding");
        expect(text).not.toContain("credentials");
    });
});

describe("PowerShellSnippet", () => {
    const snippet = new PowerShellSnippet();

    test("generate_WhenEverythingIsIncluded_ShouldSplatParametersAndPrintStatusHeadersAndContent", () => {
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
        const text = snippet.generate(snapshot, Defaults);

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
    ])("generate_WhenMethodIs(%s)_ShouldPass(%s)", (method, expected) => {
        // Arrange
        const snapshot = aSnapshot({
            method,
        });

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text).toContain(expected);
    });

    test("generate_WhenTheBodyHasLineBreaks_ShouldBuildThemExplicitly", () => {
        // Arrange
        const snapshot = aSnapshot({
            body: "a\r\nb\nc",
        });

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text).toContain("GetBytes(('a' + \"`r`n\" + 'b' + \"`n\" + 'c'))");
    });

    test("generate_WhenTheMethodHasNoBody_ShouldLeaveTheBodyOut", () => {
        // Arrange
        const snapshot = aSnapshot({
            method: "GET",
        });

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text).not.toContain("Body = ");
    });

    test("generate_WhenTheBodyHoldsSmartQuotes_ShouldDoubleThem", () => {
        // Arrange
        const snapshot = aSnapshot({
            body: "it\u2019s",
        });

        // Act
        const text = snippet.generate(snapshot, Defaults);

        // Assert
        expect(text).toContain("GetBytes('it\u2019\u2019s')");
    });
});

describe("SnippetGenerators", () => {
    test("get_WhenTheIdIsUnknown_ShouldFallBackToTheFirstGenerator", () => {
        // Arrange
        const id = "telnet";

        // Act
        const generator = SnippetGenerators.get(id);

        // Assert
        expect(generator.id).toBe("curl");
    });

    test("all_WhenListed_ShouldOfferEveryFormat", () => {
        // Arrange
        const expected = [
            "curl",
            "curl-cmd",
            "wget",
            "fetch",
            "fetch-node",
            "powershell",
        ];

        // Act
        const ids = SnippetGenerators.all().map(generator => generator.id);

        // Assert
        expect(ids).toEqual(expected);
    });

    test.each(MethodCases.flatMap(method => SnippetGenerators.all().map(generator => [
        generator.id,
        method,
    ])))("generate_WhenGenerator(%s)GetsMethod(%s)_ShouldMentionTheUrlAndSkipTransportHeaders", (generatorId, method) => {
        // Arrange
        const snapshot = aSnapshot({
            method,
        });

        // Act
        const text = SnippetGenerators.get(generatorId).generate(snapshot, Defaults);

        // Assert
        expect(text).toContain("api.example.com/users?tag=a");
        expect(text).not.toMatch(/Content-Length|:authority|Connection|\bHost\b/);
    });
});
