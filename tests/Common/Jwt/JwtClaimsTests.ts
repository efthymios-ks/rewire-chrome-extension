import { describe, expect, test } from "vitest";
import { JwtClaims, JwtValidity } from "../../../src/Common/Jwt/JwtClaims";

const Now = new Date("2026-11-09T12:00:00Z");
const HourInSeconds = 3600;
const NowInSeconds = Now.getTime() / 1000;

describe("JwtClaims", () => {
    test.each([
        [
            "iat",
            true,
        ],
        [
            "nbf",
            true,
        ],
        [
            "exp",
            true,
        ],
        [
            "sub",
            false,
        ],
    ])("isTimeClaim_WhenTheNameIs(%s)_ShouldReturn(%s)", (name, expected) => {
        // Arrange
        const claim = name;

        // Act
        const isTimeClaim = JwtClaims.isTimeClaim(claim);

        // Assert
        expect(isTimeClaim).toBe(expected);
    });

    test("timesOf_WhenThePayloadHasTimeClaims_ShouldTurnSecondsIntoDates", () => {
        // Arrange
        const payload = {
            iat: NowInSeconds,
            exp: NowInSeconds + HourInSeconds,
            sub: "42",
        };

        // Act
        const times = JwtClaims.timesOf(payload);

        // Assert
        expect(times.map(time => `${time.label} ${time.at.toISOString()}`)).toEqual([
            "Issued at 2026-11-09T12:00:00.000Z",
            "Expires at 2026-11-09T13:00:00.000Z",
        ]);
    });

    test.each([
        [
            "an expiry ahead",
            {
                exp: NowInSeconds + HourInSeconds,
            },
            JwtValidity.Valid,
        ],
        [
            "an expiry behind",
            {
                exp: NowInSeconds - HourInSeconds,
            },
            JwtValidity.Expired,
        ],
        [
            "a not-before ahead",
            {
                nbf: NowInSeconds + HourInSeconds,
                exp: NowInSeconds + 2 * HourInSeconds,
            },
            JwtValidity.NotYetValid,
        ],
        [
            "no expiry",
            {
                sub: "42",
            },
            JwtValidity.NoExpiry,
        ],
    ])("validityOf_WhenThePayloadHas(%s)_ShouldReturn(%s)", (
        _case,
        payload,
        expected
    ) => {
        // Arrange
        const claims: Record<string, unknown> = payload;

        // Act
        const validity = JwtClaims.validityOf(claims, Now);

        // Assert
        expect(validity).toBe(expected);
    });
});
