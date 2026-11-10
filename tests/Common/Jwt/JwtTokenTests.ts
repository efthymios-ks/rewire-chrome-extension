import { describe, expect, test } from "vitest";
import { JwtToken } from "../../../src/Common/Jwt/JwtToken";
import { aToken } from "./JwtTestData";

describe("JwtToken", () => {
    test.each([
        [
            "a bare token",
            "",
        ],
        [
            "a Bearer token",
            "Bearer ",
        ],
    ])("decode_WhenGiven(%s)_ShouldReadTheHeaderAndClaims", (_case, prefix) => {
        // Arrange
        const text = `${prefix}${aToken({
            sub: "42",
            name: "Ada",
        })}`;

        // Act
        const decoded = JwtToken.decode(text);

        // Assert
        expect(decoded).toEqual({
            hasErrors: false,
            value: {
                header: {
                    alg: "HS256",
                    typ: "JWT",
                },
                payload: {
                    sub: "42",
                    name: "Ada",
                },
                signature: "signature",
            },
        });
    });

    test.each([
        [
            "only two parts",
            "abc.def",
        ],
        [
            "a header that is not JSON",
            "bm90LWpzb24.e30.sig",
        ],
        [
            "a payload that is an array",
            `${aToken({}).split(".")[0]}.W10.sig`,
        ],
    ])("decode_WhenTheTokenHas(%s)_ShouldFail", (_case, text) => {
        // Arrange
        const token = text;

        // Act
        const decoded = JwtToken.decode(token);

        // Assert
        expect(decoded.hasErrors).toBe(true);
    });

    test.each([
        [
            `Bearer ${aToken({
                sub: "42",
            })}`,
            true,
        ],
        [
            "Basic YWRhOnNlY3JldA==",
            false,
        ],
        [
            "Bearer opaque-token",
            false,
        ],
    ])("looksLike_WhenTheValueIs(%s)_ShouldReturn(%s)", (value, expected) => {
        // Arrange
        const text = value;

        // Act
        const looksLike = JwtToken.looksLike(text);

        // Assert
        expect(looksLike).toBe(expected);
    });
});
