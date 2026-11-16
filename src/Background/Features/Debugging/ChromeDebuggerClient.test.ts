import { afterEach, describe, expect, test, vi } from 'vitest';
import { ChromeDebuggerClient } from './ChromeDebuggerClient';
import { DefaultDebuggerSessions } from './DefaultDebuggerSessions';

function stubChrome() {
    const sendCommand = vi.fn().mockResolvedValue({});
    vi.stubGlobal('chrome', {
        debugger: {
            sendCommand,
        },
    });

    return sendCommand;
}

describe('ChromeDebuggerClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('sendAsync_WhenTheRequestCameFromAnIframe_ShouldSendToThatIframeSession', async () => {
        // Arrange
        const sendCommand = stubChrome();
        const sessions = new DefaultDebuggerSessions();
        sessions.remember({ tabId: 1, requestId: 'request-1', sessionId: 'session-a' });
        const client = new ChromeDebuggerClient(sessions);

        // Act
        await client.sendAsync(
            /* tabId: */ 1,
            /* command: */ 'Network.getResponseBody',
            /* params: */ {
                requestId: 'request-1',
            },
        );

        // Assert
        expect(sendCommand).toHaveBeenCalledWith(
            /* target: */ {
                tabId: 1,
                sessionId: 'session-a',
            },
            /* method: */ 'Network.getResponseBody',
            /* commandParams: */ {
                requestId: 'request-1',
            },
        );
    });

    test('sendAsync_WhenTheRequestCameFromTheTopFrame_ShouldSendToTheTab', async () => {
        // Arrange
        const sendCommand = stubChrome();
        const client = new ChromeDebuggerClient(new DefaultDebuggerSessions());

        // Act
        await client.sendAsync(
            /* tabId: */ 1,
            /* command: */ 'Network.getResponseBody',
            /* params: */ {
                requestId: 'request-1',
            },
        );

        // Assert
        expect(sendCommand.mock.calls[0]?.[0]).toEqual({
            tabId: 1,
        });
    });

    test('sendToSessionAsync_WhenTheCommandFails_ShouldNameTheCommand', async () => {
        // Arrange
        const sendCommand = stubChrome();
        sendCommand.mockRejectedValue(new Error('No target'));
        const client = new ChromeDebuggerClient(new DefaultDebuggerSessions());

        // Act
        const result = await client.sendToSessionAsync(
            /* tabId: */ 1,
            /* sessionId: */ 'session-a',
            /* command: */ 'Runtime.runIfWaitingForDebugger',
        );

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Runtime.runIfWaitingForDebugger failed: No target',
        });
    });
});
