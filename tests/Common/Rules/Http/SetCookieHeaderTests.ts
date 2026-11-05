import { describe, expect, test } from "vitest";
import { type SetCookie, SetCookieHeader } from "../../../../src/Common/Rules/Http/SetCookieHeader";

describe("SetCookieHeader", () => {
    test("empty_WhenNameAndValueAreGiven_ShouldLeaveEveryAttributeUnset", () => {
        // Arrange
        const name = "session";

        // Act
        const cookie = SetCookieHeader.empty(name, "abc");

        // Assert
        expect(cookie).toEqual({
            name: "session",
            value: "abc",
            domain: "",
            path: "",
            expires: "",
            maxAge: "",
            secure: false,
            httpOnly: false,
            sameSite: "",
            partitioned: false,
        });
    });

    test("parse_WhenEveryAttributeIsPresent_ShouldReadThemAll", () => {
        // Arrange
        const header = "session=abc; Domain=.example.com; Path=/; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Max-Age=3600; Secure; HttpOnly; SameSite=Lax; Partitioned";

        // Act
        const cookie = SetCookieHeader.parse(header);

        // Assert
        expect(cookie).toEqual({
            name: "session",
            value: "abc",
            domain: ".example.com",
            path: "/",
            expires: "Wed, 21 Oct 2026 07:28:00 GMT",
            maxAge: "3600",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
            partitioned: true,
        });
    });

    test("parse_WhenAttributeNamesDifferInCaseOrAreUnknown_ShouldReadKnownOnesOnly", () => {
        // Arrange
        const header = "token=a=b; SECURE; httponly; samesite=None; Priority=High";

        // Act
        const cookie = SetCookieHeader.parse(header);

        // Assert
        expect(cookie).toEqual({
            ...SetCookieHeader.empty("token", "a=b"),
            secure: true,
            httpOnly: true,
            sameSite: "None",
        });
    });

    test("serialize_WhenOnlySomeAttributesAreSet_ShouldOmitTheRest", () => {
        // Arrange
        const cookie: SetCookie = {
            ...SetCookieHeader.empty("theme", "dark"),
            path: "/app",
            secure: true,
        };

        // Act
        const header = SetCookieHeader.serialize(cookie);

        // Assert
        expect(header).toBe("theme=dark; Path=/app; Secure");
    });

    test("serialize_WhenParsedHeaderIsWrittenBack_ShouldUseCanonicalAttributeNames", () => {
        // Arrange
        const cookie = SetCookieHeader.parse("id=7; max-age=60; samesite=Strict; path=/; httponly; domain=example.com");

        // Act
        const header = SetCookieHeader.serialize(cookie);

        // Assert
        expect(header).toBe("id=7; Domain=example.com; Path=/; Max-Age=60; HttpOnly; SameSite=Strict");
    });
});
