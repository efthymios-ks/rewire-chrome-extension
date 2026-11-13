import { describe, expect, test } from "vitest";
import { CdpRequestId } from "../../../../src/Background/Features/Debugging/CdpRequestId";

describe("CdpRequestId", () => {
    test.each([
        [
            {
                requestId: "request-1",
            },
            "request-1",
        ],
        [
            {
                requestId: 7,
            },
            null,
        ],
        [
            {},
            null,
        ],
        [
            null,
            null,
        ],
    ])("of_WhenTheParamsAre(%o)_ShouldReturn(%s)", (params, expected) => {
        // Arrange
        const input: unknown = params;

        // Act
        const requestId = CdpRequestId.of(input);

        // Assert
        expect(requestId).toBe(expected);
    });
});
