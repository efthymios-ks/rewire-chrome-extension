import { describe, expect, test, vi } from "vitest";
import { DebuggerSessions } from "../../../../src/Background/Features/Debugging/DebuggerSessions";
import { LiveListeningRegistry } from "../../../../src/Background/Features/Live/LiveListeningRegistry";
import { LiveListeningService } from "../../../../src/Background/Features/Live/LiveListeningService";
import { Result } from "../../../../src/Common/Results/Result";
import { NoLiveListening } from "../../../../src/Contracts/Live/LiveListening";
import { createLogger } from "../../BackgroundTestData";

function setUp(isAttached: boolean) {
    const registry = new LiveListeningRegistry();
    const sessions = new DebuggerSessions();
    sessions.addChild(7, "session-a");
    const installer = {
        install: vi.fn().mockResolvedValue(Result.done()),
        uninstall: vi.fn().mockResolvedValue(undefined),
        forget: vi.fn(),
    };
    const service = new LiveListeningService({
        registry,
        installer,
        sessions,
        isAttached: () => isAttached,
        logger: createLogger(),
    });

    return {
        registry,
        installer,
        service,
    };
}

const PostMessagesOn = {
    ...NoLiveListening,
    postMessages: true,
};

describe("LiveListeningService", () => {
    test("set_WhenPostMessagesTurnOn_ShouldInstallTheProbeInEverySession", async () => {
        // Arrange
        const { registry, installer, service } = setUp(true);

        // Act
        await service.set(7, PostMessagesOn);

        // Assert
        expect(registry.of(7)).toEqual(PostMessagesOn);
        expect(installer.install.mock.calls).toEqual([
            [
                7,
                null,
            ],
            [
                7,
                "session-a",
            ],
        ]);
    });

    test("set_WhenPostMessagesTurnOff_ShouldUninstallTheProbe", async () => {
        // Arrange
        const { installer, service } = setUp(true);
        await service.set(7, PostMessagesOn);

        // Act
        await service.set(7, NoLiveListening);

        // Assert
        expect(installer.uninstall).toHaveBeenCalledTimes(2);
    });

    test("set_WhenOnlySocketsChange_ShouldNotTouchTheSessions", async () => {
        // Arrange
        const { installer, service } = setUp(true);

        // Act
        await service.set(7, {
            ...NoLiveListening,
            webSockets: true,
        });

        // Assert
        expect(installer.install).not.toHaveBeenCalled();
    });

    test("set_WhenTheTabIsNotAttached_ShouldOnlyRememberIt", async () => {
        // Arrange
        const { registry, installer, service } = setUp(false);

        // Act
        await service.set(7, PostMessagesOn);

        // Assert
        expect(registry.of(7).postMessages).toBe(true);
        expect(installer.install).not.toHaveBeenCalled();
    });

    test("forget_WhenTheTabGoes_ShouldDropItsListeningAndScripts", () => {
        // Arrange
        const { registry, installer, service } = setUp(true);
        registry.set(7, PostMessagesOn);

        // Act
        service.forget(7);

        // Assert
        expect(registry.of(7)).toEqual(NoLiveListening);
        expect(installer.forget).toHaveBeenCalledWith(7);
    });
});
