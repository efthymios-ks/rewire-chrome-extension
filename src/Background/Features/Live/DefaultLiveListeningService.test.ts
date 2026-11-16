import { describe, expect, test, vi } from 'vitest';
import { DefaultDebuggerSessions } from '../Debugging/DefaultDebuggerSessions';
import { DefaultLiveListeningRegistry } from './DefaultLiveListeningRegistry';
import { DefaultLiveListeningService } from './DefaultLiveListeningService';
import { Result } from '../../../Common/Results/Result';
import { NO_LIVE_LISTENING } from '../../../Contracts/Live/NoLiveListening';
import { createLogger } from '../../../TestData';

function setUp(isAttached: boolean) {
    const registry = new DefaultLiveListeningRegistry();
    const sessions = new DefaultDebuggerSessions();
    sessions.addChild(7, 'session-a');
    const installer = {
        installAsync: vi.fn().mockResolvedValue(Result.done()),
        uninstallAsync: vi.fn().mockResolvedValue(undefined),
        forget: vi.fn(),
    };
    const service = new DefaultLiveListeningService({
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

const POST_MESSAGES_ON = {
    ...NO_LIVE_LISTENING,
    postMessages: true,
};

describe('DefaultLiveListeningService', () => {
    test('setAsync_WhenPostMessagesTurnOn_ShouldInstallTheProbeInEverySession', async () => {
        // Arrange
        const { registry, installer, service } = setUp(true);

        // Act
        await service.setAsync(7, POST_MESSAGES_ON);

        // Assert
        expect(registry.of(7)).toEqual(POST_MESSAGES_ON);
        expect(installer.installAsync.mock.calls).toEqual([
            [
                7,
                null,
            ],
            [
                7,
                'session-a',
            ],
        ]);
    });

    test('setAsync_WhenPostMessagesTurnOff_ShouldUninstallTheProbe', async () => {
        // Arrange
        const { installer, service } = setUp(true);
        await service.setAsync(7, POST_MESSAGES_ON);

        // Act
        await service.setAsync(7, NO_LIVE_LISTENING);

        // Assert
        expect(installer.uninstallAsync).toHaveBeenCalledTimes(2);
    });

    test('setAsync_WhenOnlySocketsChange_ShouldNotTouchTheSessions', async () => {
        // Arrange
        const { installer, service } = setUp(true);

        // Act
        await service.setAsync(7, {
            ...NO_LIVE_LISTENING,
            webSockets: true,
        });

        // Assert
        expect(installer.installAsync).not.toHaveBeenCalled();
    });

    test('setAsync_WhenTheTabIsNotAttached_ShouldOnlyRememberIt', async () => {
        // Arrange
        const { registry, installer, service } = setUp(false);

        // Act
        await service.setAsync(7, POST_MESSAGES_ON);

        // Assert
        expect(registry.of(7).postMessages).toBe(true);
        expect(installer.installAsync).not.toHaveBeenCalled();
    });

    test('forget_WhenTheTabGoes_ShouldDropItsListeningAndScripts', () => {
        // Arrange
        const { registry, installer, service } = setUp(true);
        registry.set(7, POST_MESSAGES_ON);

        // Act
        service.forget(7);

        // Assert
        expect(registry.of(7)).toEqual(NO_LIVE_LISTENING);
        expect(installer.forget).toHaveBeenCalledWith(7);
    });
});
