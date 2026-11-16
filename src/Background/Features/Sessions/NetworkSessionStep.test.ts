import { describe, expect, test } from 'vitest';
import { NetworkSessionStep } from './NetworkSessionStep';
import { createDebuggerClientMock } from '../../BackgroundTestData';

describe('NetworkSessionStep', () => {
    test('applyAsync_WhenASessionStarts_ShouldTurnOnNetworkCapture', async () => {
        // Arrange
        const debuggerMock = createDebuggerClientMock();
        const step = new NetworkSessionStep(debuggerMock.client);

        // Act
        await step.applyAsync(7, null);

        // Assert
        expect(step.isRequired).toBe(true);
        expect(debuggerMock.client.sendToSessionAsync).toHaveBeenCalledWith(
            /* tabId: */ 7,
            /* sessionId: */ null,
            /* command: */ 'Network.enable',
            /* params: */ {},
        );
    });
});
