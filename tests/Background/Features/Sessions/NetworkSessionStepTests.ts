import { describe, expect, test } from "vitest";
import { NetworkSessionStep } from "../../../../src/Background/Features/Sessions/NetworkSessionStep";
import { createDebuggerClientMock } from "../../BackgroundTestData";

describe("NetworkSessionStep", () => {
    test("apply_WhenASessionStarts_ShouldTurnOnNetworkCapture", async () => {
        // Arrange
        const debuggerMock = createDebuggerClientMock();
        const step = new NetworkSessionStep(debuggerMock.client);

        // Act
        await step.apply(7, null);

        // Assert
        expect(step.isRequired).toBe(true);
        expect(debuggerMock.client.sendToSession).toHaveBeenCalledWith(
            7,
            null,
            "Network.enable",
            {}
        );
    });
});
