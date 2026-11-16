import { describe, expect, test } from 'vitest';
import { FrameAutoAttachSessionStep } from './FrameAutoAttachSessionStep';
import { createDebuggerClientMock } from '../../BackgroundTestData';

describe('FrameAutoAttachSessionStep', () => {
    test('applyAsync_WhenASessionStarts_ShouldAttachToIframesPausedAndFlat', async () => {
        // Arrange
        const debuggerMock = createDebuggerClientMock();
        const step = new FrameAutoAttachSessionStep(debuggerMock.client);

        // Act
        await step.applyAsync(7, 'session-a');

        // Assert
        expect(step.isRequired).toBe(false);
        expect(debuggerMock.client.sendToSessionAsync).toHaveBeenCalledWith(
            /* tabId: */ 7,
            /* sessionId: */ 'session-a',
            /* command: */ 'Target.setAutoAttach',
            /* params: */ {
                autoAttach: true,
                waitForDebuggerOnStart: true,
                flatten: true,
                filter: [
                    {
                        type: 'iframe',
                    },
                ],
            },
        );
    });
});
