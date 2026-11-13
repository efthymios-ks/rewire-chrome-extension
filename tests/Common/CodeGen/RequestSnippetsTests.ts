import { describe, expect, test } from "vitest";
import { RequestSnippets } from "../../../src/Common/CodeGen/RequestSnippets";
import { aSnapshot, Defaults, FormCases, header, MethodCases } from "./SnippetTestData";

describe("RequestSnippets", () => {
    test.each(FormCases.flatMap(([contentType, body]) => RequestSnippets.all().map(type => [
        type.id,
        contentType,
        body,
    ])))("toString_WhenFormat(%s)SendsContentType(%s)_ShouldKeepTheTypeAndTheBody", (
        snippetId,
        contentType,
        body
    ) => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [header("Content-Type", contentType!)],
            body: body!,
        });

        // Act
        const text = RequestSnippets.get(snippetId!).from(snapshot, Defaults).toString();

        // Assert
        expect(text).toContain(contentType!.split(";")[0]);
        expect(text).toMatch(/--data-raw|--data-binary|--body-data|body:|Body = /);
    });

    test("get_WhenTheIdIsUnknown_ShouldFallBackToTheFirstFormat", () => {
        // Arrange
        const id = "telnet";

        // Act
        const type = RequestSnippets.get(id);

        // Assert
        expect(type.id).toBe("curl");
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
        const ids = RequestSnippets.all().map(type => type.id);

        // Assert
        expect(ids).toEqual(expected);
    });

    test.each(MethodCases.flatMap(method => RequestSnippets.all().map(type => [
        type.id,
        method,
    ])))("toString_WhenFormat(%s)GetsMethod(%s)_ShouldMentionTheUrlAndSkipTransportHeaders", (snippetId, method) => {
        // Arrange
        const snapshot = aSnapshot({
            method,
        });

        // Act
        const text = RequestSnippets.get(snippetId).from(snapshot, Defaults).toString();

        // Assert
        expect(text).toContain("api.example.com/users?tag=a");
        expect(text).not.toMatch(/Content-Length|:authority|Connection|\bHost\b/);
    });

    test.each([
        [
            "cmd",
            "curl ^\"https://api.example.com/users^\" ^\n  -H ^\"accept: */*^\"",
            "https://api.example.com/users",
        ],
        [
            "bash",
            "curl 'https://api.example.com/users' -H 'accept: */*'",
            "https://api.example.com/users",
        ],
        [
            "wget",
            "wget -q -O - 'https://api.example.com/users'",
            "https://api.example.com/users",
        ],
    ])("parse_WhenTheCommandIsFor(%s)_ShouldReadIt", (
        _case,
        text,
        expected
    ) => {
        // Arrange
        const command = text;

        // Act
        const snippet = RequestSnippets.parse(command);

        // Assert
        expect(snippet?.url).toBe(expected);
    });

    test("parse_WhenTheTextIsNoCommand_ShouldReturnNull", () => {
        // Arrange
        const text = "https://api.example.com/users";

        // Act
        const snippet = RequestSnippets.parse(text);

        // Assert
        expect(snippet).toBeNull();
    });
});
