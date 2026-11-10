import { describe, expect, test } from "vitest";
import { FetchSnippet } from "../../../src/Common/CodeGen/FetchSnippet";
import { SnippetBodies } from "../../../src/Common/CodeGen/SnippetBody";
import { aSnapshot, Defaults, header } from "./SnippetTestData";

describe("FetchSnippet", () => {
    test("toString_WhenCookiesAreIncluded_ShouldSendCredentialsInsteadOfACookieHeader", () => {
        // Arrange
        const snapshot = aSnapshot();

        // Act
        const text = FetchSnippet.from(snapshot, Defaults).toString();

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

    test("toString_WhenForbiddenHeadersWereCaptured_ShouldLeaveThemOutAndKeepTheReferrer", () => {
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
        const text = FetchSnippet.from(snapshot, Defaults).toString();

        // Assert
        expect(text).toContain("\"Accept\": \"application/json\"");
        expect(text).not.toMatch(/Accept-Encoding|User-Agent|Origin|Sec-Fetch|"Referer"/);
        expect(text).toContain("referrer: \"https://app.example.com/users\",");
        expect(text).toContain("credentials: \"omit\",");
    });

    test.each([
        "GET",
        "HEAD",
    ])("toString_WhenMethodIs(%s)_ShouldLeaveTheBodyOut", method => {
        // Arrange
        const snapshot = aSnapshot({
            method,
        });

        // Act
        const text = FetchSnippet.from(snapshot, Defaults).toString();

        // Assert
        expect(text).not.toContain("body:");
    });
    test("tryParse_WhenGivenAnyText_ShouldReturnNull", () => {
        // Arrange
        const text = "await fetch(\"https://api.example.com/users\");";

        // Act
        const snippet = FetchSnippet.tryParse(text);

        // Assert
        expect(snippet).toBeNull();
    });

    test("toString_WhenTheBodyIsAMultipartForm_ShouldBuildFormData", () => {
        // Arrange
        const snippet = FetchSnippet.from(aSnapshot(), Defaults);
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
        expect(text).toContain("const form = new FormData();");
        expect(text).toContain("form.append(\"title\", \"Hello\");");
        expect(text).toContain("form.append(\"avatar\", document.querySelector(\"input[type=file]\").files[0], \"photo.png\");");
        expect(text).toContain("body: form,");
        expect(text).not.toContain("Content-Type");
    });
});
