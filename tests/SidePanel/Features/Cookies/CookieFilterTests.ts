import { describe, expect, test } from "vitest";
import { CookieFilter } from "../../../../src/SidePanel/Features/Cookies/CookieFilter";

const Cookies = [
    {
        name: "MC1",
        value: "GUID=df848449e0aa403c&HASH=df84",
    },
    {
        name: "session",
        value: "abc123",
    },
    {
        name: "theme",
        value: "dark",
    },
];

describe("CookieFilter", () => {
    test.each([
        [
            "",
            [
                "MC1",
                "session",
                "theme",
            ],
        ],
        [
            "SESS",
            ["session"],
        ],
        [
            "hash=df",
            ["MC1"],
        ],
        [
            "  dark ",
            ["theme"],
        ],
        [
            "missing",
            [],
        ],
    ])("apply_WhenTheTextIs(%s)_ShouldKeepCookiesWhoseNameOrValueContainsIt", (text, expected) => {
        // Arrange
        const search = text;

        // Act
        const kept = CookieFilter.apply(Cookies, search);

        // Assert
        expect(kept.map(cookie => cookie.name)).toEqual(expected);
    });
});
