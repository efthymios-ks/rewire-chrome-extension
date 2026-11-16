import { describe, expect, test, vi } from 'vitest';
import { DefaultLiveListeningRegistry } from '../Live/DefaultLiveListeningRegistry';
import { PostMessageSessionStep } from './PostMessageSessionStep';
import { Result } from '../../../Common/Results/Result';
import { NO_LIVE_LISTENING } from '../../../Contracts/Live/NoLiveListening';

function setUp(isListening: boolean) {
    const registry = new DefaultLiveListeningRegistry();
    registry.set(7, {
        ...NO_LIVE_LISTENING,
        postMessages: isListening,
    });
    const installer = {
        installAsync: vi.fn().mockResolvedValue(Result.done()),
        uninstallAsync: vi.fn(),
        forget: vi.fn(),
    };

    return {
        installer,
        step: new PostMessageSessionStep(installer, registry),
    };
}

describe('PostMessageSessionStep', () => {
    test('applyAsync_WhenPostMessagesAreListenedTo_ShouldInstallTheProbe', async () => {
        // Arrange
        const { installer, step } = setUp(true);

        // Act
        await step.applyAsync(7, 'session-a');

        // Assert
        expect(installer.installAsync).toHaveBeenCalledWith(7, 'session-a');
    });

    test('applyAsync_WhenNotListening_ShouldLeaveTheSessionAlone', async () => {
        // Arrange
        const { installer, step } = setUp(false);

        // Act
        const result = await step.applyAsync(7, 'session-a');

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(installer.installAsync).not.toHaveBeenCalled();
    });
});
