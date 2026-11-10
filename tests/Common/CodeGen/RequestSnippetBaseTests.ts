import { describe, expect, test } from "vitest";
import { RequestSnippetBase } from "../../../src/Common/CodeGen/RequestSnippetBase";
import { SnippetBodies } from "../../../src/Common/CodeGen/SnippetBody";

class EchoSnippet extends RequestSnippetBase {
    override toString(): string {
        return `${this.request.method} ${this.request.url}`;
    }
}

function anEcho(): EchoSnippet {
    return new EchoSnippet({
        method: "get",
        url: "https://api.example.com/users",
        headers: [],
        cookies: [],
        body: SnippetBodies.none(),
    });
}

describe("RequestSnippetBase", () => {
    test("constructor_WhenTheMethodIsLowerCase_ShouldStoreItInUpperCase", () => {
        // Arrange
        const expected = "GET";

        // Act
        const snippet = anEcho();

        // Assert
        expect(snippet.method).toBe(expected);
    });

    test("setters_WhenEveryPartChanges_ShouldRenderTheNewRequest", () => {
        // Arrange
        const snippet = anEcho();

        // Act
        snippet.method = "delete";
        snippet.url = "https://api.example.com/users/42";
        snippet.headers = [
            {
                name: "Accept",
                value: "*/*",
            },
        ];
        snippet.cookies = [
            {
                name: "a",
                value: "1",
            },
        ];
        snippet.body = SnippetBodies.text("x");

        // Assert
        expect(snippet.toString()).toBe("DELETE https://api.example.com/users/42");
        expect(snippet.headers).toHaveLength(1);
        expect(snippet.cookies).toHaveLength(1);
        expect(snippet.body).toEqual(SnippetBodies.text("x"));
    });
});
