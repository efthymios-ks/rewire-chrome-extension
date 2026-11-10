import { describe, expect, test } from "vitest";
import { JwtStatusText } from "../../../../src/SidePanel/Features/Jwt/JwtStatusText";

const Now = new Date("2026-11-09T12:00:00Z");
const NowInSeconds = Now.getTime() / 1000;
const HourInSeconds = 3600;

describe("JwtStatusText", () => {
    test.each([
        [
            {
                exp: NowInSeconds + HourInSeconds,
            },
            "Valid until 2026-11-09T13:00:00Z",
        ],
        [
            {
                exp: NowInSeconds - HourInSeconds,
            },
            "Expired at 2026-11-09T11:00:00Z",
        ],
        [
            {
                nbf: NowInSeconds + HourInSeconds,
            },
            "Not valid before 2026-11-09T13:00:00Z",
        ],
        [
            {},
            "Never expires",
        ],
    ])("of_WhenThePayloadIs(%j)_ShouldSay(%s)", (payload, expected) => {
        // Arrange
        const claims: Record<string, unknown> = payload;

        // Act
        const text = JwtStatusText.of(claims, Now);

        // Assert
        expect(text).toBe(expected);
    });
});
