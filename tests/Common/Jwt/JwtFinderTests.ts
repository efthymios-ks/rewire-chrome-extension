import { describe, expect, test } from "vitest";
import { Base64Text } from "../../../src/Common/Encoding/Base64Text";
import { JwtFinder } from "../../../src/Common/Jwt/JwtFinder";

function partOf(value: object): string {
    return Base64Text
        .fromUtf8(JSON.stringify(value))
        .replace(/=+$/, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

const Token = `${partOf({
    alg: "HS256",
    typ: "JWT",
})}.${partOf({
    sub: "user-42",
})}.signature`;

describe("JwtFinder", () => {
    test("find_WhenAPayloadCarriesAToken_ShouldReturnIt", () => {
        // Arrange
        const payload = `42["auth",{"token":"${Token}"}]`;

        // Act
        const token = JwtFinder.find(payload);

        // Assert
        expect(token).toBe(Token);
    });

    test("find_WhenThePayloadHasNoToken_ShouldReturnNull", () => {
        // Arrange
        const payload = "{\"type\":\"ping\"}";

        // Act
        const token = JwtFinder.find(payload);

        // Assert
        expect(token).toBeNull();
    });
});
