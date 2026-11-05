import { describe, expect, test } from "vitest";
import { CookieDrafts } from "../../../../src/SidePanel/Features/Cookies/CookieDrafts";

describe("CookieDrafts", () => {
    test.each([
        [
            ".example.com",
            "/",
            true,
            "https://example.com/",
        ],
        [
            "api.example.com",
            "/v1",
            false,
            "http://api.example.com/v1",
        ],
        [
            "api.example.com",
            "",
            true,
            "https://api.example.com/",
        ],
    ])("urlOf_WhenDomainAndPathAre(%s, '%s')_ShouldBuildTheCookieUrl", (
        domain,
        path,
        secure,
        expected
    ) => {
        // Arrange
        const isSecure = secure;

        // Act
        const url = CookieDrafts.urlOf(
            domain,
            path,
            isSecure
        );

        // Assert
        expect(url).toBe(expected);
    });

    test("expirationOf_WhenTheCookieIsASessionCookie_ShouldReturnUndefined", () => {
        // Arrange
        const draft = CookieDrafts.blank("example.com", true);

        // Act
        const expiration = CookieDrafts.expirationOf(draft);

        // Assert
        expect(expiration).toBeUndefined();
    });

    test("fromCookie_WhenTheCookieExpires_ShouldRoundTripTheExpiry", () => {
        // Arrange
        const expirationDate = 1_793_872_800;
        const draft = CookieDrafts.fromCookie({
            name: "session",
            value: "abc",
            domain: "example.com",
            path: "/",
            hostOnly: true,
            secure: true,
            httpOnly: true,
            sameSite: "lax",
            session: false,
            storeId: "0",
            expirationDate,
        });

        // Act
        const expiration = CookieDrafts.expirationOf(draft);

        // Assert
        expect(expiration).toBe(expirationDate);
    });
});
