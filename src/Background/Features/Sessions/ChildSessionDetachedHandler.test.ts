import { describe, expect, test } from 'vitest';
import { DefaultDebuggerSessions } from '../Debugging/DefaultDebuggerSessions';
import { ChildSessionDetachedHandler } from './ChildSessionDetachedHandler';

describe('ChildSessionDetachedHandler', () => {
    test('handleAsync_WhenAnIframeGoes_ShouldForgetItsSession', async () => {
        // Arrange
        const sessions = new DefaultDebuggerSessions();
        sessions.addChild(1, 'session-a');
        const handler = new ChildSessionDetachedHandler(sessions);

        // Act
        await handler.handleAsync(
            /* tabId: */ 1,
            /* params: */ {
                sessionId: 'session-a',
            },
        );

        // Assert
        expect(sessions.childrenOf(1)).toEqual([]);
    });
});
