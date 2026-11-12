import { describe, expect, test } from "vitest";
import { SensitiveHeaders } from "../../../src/Common/Http/SensitiveHeaders";

describe("SensitiveHeaders", () => {
    test.each([
        [
            "Authorization",
            true,
        ],
        [
            " cookie ",
            true,
        ],
        [
            "Set-Cookie",
            true,
        ],
        [
            "X-API-Key",
            true,
        ],
        [
            "Accept",
            false,
        ],
    ])("isSensitive_WhenTheNameIs(%s)_ShouldReturn(%s)", (name, expected) => {
        // Arrange
        const headerName = name;

        // Act
        const isSensitive = SensitiveHeaders.isSensitive(headerName);

        // Assert
        expect(isSensitive).toBe(expected);
    });
});
