import { describe, expect, test } from "vitest";
import type { RequestSnapshot } from "../../../src/Common/CodeGen/RequestSnapshot";
import { SnippetChoices } from "../../../src/Common/CodeGen/SnippetChoices";

function aSnapshot(overrides: Partial<RequestSnapshot> = {}): RequestSnapshot {
    return {
        method: "POST",
        url: "https://api.example.com/users?tag=a&tag=b&page=2",
        headers: [
            {
                name: "Content-Type",
                value: "application/json",
            },
            {
                name: "X-Tenant",
                value: "blue",
            },
            {
                name: "x-tenant",
                value: "green",
            },
            {
                name: "Cookie",
                value: "session=1; theme=dark",
            },
            {
                name: "Cookie",
                value: "session=2",
            },
            {
                name: ":authority",
                value: "api.example.com",
            },
            {
                name: "Content-Length",
                value: "13",
            },
        ],
        body: "{}",
        ...overrides,
    };
}

describe("SnippetChoices", () => {
    test("headersOf_WhenHeadersRepeatOrAreNeverSent_ShouldListEachSendableHeaderOnce", () => {
        // Arrange
        const snapshot = aSnapshot();

        // Act
        const choices = SnippetChoices.headersOf(snapshot);

        // Assert
        expect(choices).toEqual([
            {
                key: "content-type",
                label: "Content-Type",
            },
            {
                key: "x-tenant",
                label: "X-Tenant",
            },
        ]);
    });

    test("cookiesOf_WhenCookieHeadersRepeat_ShouldListEachCookieNameOnce", () => {
        // Arrange
        const snapshot = aSnapshot();

        // Act
        const choices = SnippetChoices.cookiesOf(snapshot);

        // Assert
        expect(choices.map(choice => choice.key)).toEqual([
            "session",
            "theme",
        ]);
    });

    test("queryParamsOf_WhenKeysRepeat_ShouldListEachKeyOnce", () => {
        // Arrange
        const snapshot = aSnapshot();

        // Act
        const choices = SnippetChoices.queryParamsOf(snapshot);

        // Assert
        expect(choices.map(choice => choice.key)).toEqual([
            "tag",
            "page",
        ]);
    });

    test.each([
        [
            "{}",
            true,
        ],
        [
            "",
            false,
        ],
        [
            null,
            false,
        ],
    ])("hasBody_WhenTheBodyIs(%j)_ShouldReturn(%s)", (body, expected) => {
        // Arrange
        const snapshot = aSnapshot({
            body,
        });

        // Act
        const hasBody = SnippetChoices.hasBody(snapshot);

        // Assert
        expect(hasBody).toBe(expected);
    });
});
