import { describe, expect, test, vi } from 'vitest';
import { CdpEventDispatcher } from './CdpEventDispatcher';
import { DefaultDebuggerSessions } from './DefaultDebuggerSessions';

function aHandler() {
    return {
        event: 'Network.loadingFinished' as const,
        handleAsync: vi.fn().mockResolvedValue(undefined),
    };
}

describe('CdpEventDispatcher', () => {
    test('dispatchAsync_WhenAnIframeSessionReportsARequest_ShouldRememberItsSession', async () => {
        // Arrange
        const sessions = new DefaultDebuggerSessions();
        const handler = aHandler();
        const dispatcher = new CdpEventDispatcher(sessions).register(handler);
        const params = {
            requestId: 'request-1',
        };

        // Act
        await dispatcher.dispatchAsync(
            /* source: */ {
                tabId: 1,
                sessionId: 'session-a',
            },
            /* method: */ 'Network.loadingFinished',
            /* params: */ params,
        );

        // Assert
        expect(sessions.sessionOf(1, 'request-1')).toBe('session-a');
        expect(handler.handleAsync).toHaveBeenCalledWith(
            /* tabId: */ 1,
            /* params: */ params,
            /* sessionId: */ 'session-a',
        );
    });

    test('dispatchAsync_WhenTheTopSessionReportsARequest_ShouldPassNoSession', async () => {
        // Arrange
        const sessions = new DefaultDebuggerSessions();
        const handler = aHandler();
        const dispatcher = new CdpEventDispatcher(sessions).register(handler);

        // Act
        await dispatcher.dispatchAsync(
            /* source: */ {
                tabId: 1,
            },
            /* method: */ 'Network.loadingFinished',
            /* params: */ {
                requestId: 'request-1',
            },
        );

        // Assert
        expect(sessions.sessionOf(1, 'request-1')).toBeUndefined();
        expect(handler.handleAsync.mock.calls[0]?.[2]).toBeNull();
    });

    test('dispatchAsync_WhenTheSourceHasNoTab_ShouldIgnoreTheEvent', async () => {
        // Arrange
        const handler = aHandler();
        const dispatcher = new CdpEventDispatcher(new DefaultDebuggerSessions()).register(handler);

        // Act
        await dispatcher.dispatchAsync(
            /* source: */ {},
            /* method: */ 'Network.loadingFinished',
            /* params: */ {},
        );

        // Assert
        expect(handler.handleAsync).not.toHaveBeenCalled();
    });

    test('dispatchAsync_WhenTwoHandlersShareAnEvent_ShouldRunBothInOrder', async () => {
        // Arrange
        const calls: string[] = [];
        const first = {
            event: 'Network.loadingFinished' as const,
            handleAsync: vi.fn(async () => {
                calls.push('first');
            }),
        };
        const second = {
            event: 'Network.loadingFinished' as const,
            handleAsync: vi.fn(async () => {
                calls.push('second');
            }),
        };
        const dispatcher = new CdpEventDispatcher(new DefaultDebuggerSessions())
            .register(first)
            .register(second);

        // Act
        await dispatcher.dispatchAsync(
            /* source: */ {
                tabId: 1,
            },
            /* method: */ 'Network.loadingFinished',
            /* params: */ {},
        );

        // Assert
        expect(calls).toEqual([
            'first',
            'second',
        ]);
    });
});
