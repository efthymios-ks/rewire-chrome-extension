import { describe, expect, test, vi } from "vitest";
import { LiveListeningRegistry } from "../../../../src/Background/Features/Live/LiveListeningRegistry";
import { PostMessageSessionStep } from "../../../../src/Background/Features/PostMessages/PostMessageSessionStep";
import { Result } from "../../../../src/Common/Results/Result";
import { NoLiveListening } from "../../../../src/Contracts/Live/LiveListening";

function setUp(isListening: boolean) {
    const registry = new LiveListeningRegistry();
    registry.set(7, {
        ...NoLiveListening,
        postMessages: isListening,
    });
    const installer = {
        install: vi.fn().mockResolvedValue(Result.done()),
        uninstall: vi.fn(),
        forget: vi.fn(),
    };

    return {
        installer,
        step: new PostMessageSessionStep(installer, registry),
    };
}

describe("PostMessageSessionStep", () => {
    test("apply_WhenPostMessagesAreListenedTo_ShouldInstallTheProbe", async () => {
        // Arrange
        const { installer, step } = setUp(true);

        // Act
        await step.apply(7, "session-a");

        // Assert
        expect(installer.install).toHaveBeenCalledWith(7, "session-a");
    });

    test("apply_WhenNotListening_ShouldLeaveTheSessionAlone", async () => {
        // Arrange
        const { installer, step } = setUp(false);

        // Act
        const result = await step.apply(7, "session-a");

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(installer.install).not.toHaveBeenCalled();
    });
});
