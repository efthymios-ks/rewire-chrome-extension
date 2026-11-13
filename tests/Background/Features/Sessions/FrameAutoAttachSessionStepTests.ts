import { describe, expect, test } from "vitest";
import { FrameAutoAttachSessionStep } from "../../../../src/Background/Features/Sessions/FrameAutoAttachSessionStep";
import { createDebuggerClientMock } from "../../BackgroundTestData";

describe("FrameAutoAttachSessionStep", () => {
    test("apply_WhenASessionStarts_ShouldAttachToIframesPausedAndFlat", async () => {
        // Arrange
        const debuggerMock = createDebuggerClientMock();
        const step = new FrameAutoAttachSessionStep(debuggerMock.client);

        // Act
        await step.apply(7, "session-a");

        // Assert
        expect(step.isRequired).toBe(false);
        expect(debuggerMock.client.sendToSession).toHaveBeenCalledWith(
            7,
            "session-a",
            "Target.setAutoAttach",
            {
                autoAttach: true,
                waitForDebuggerOnStart: true,
                flatten: true,
                filter: [
                    {
                        type: "iframe",
                    },
                ],
            }
        );
    });
});
