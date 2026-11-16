import type { Protocol } from 'devtools-protocol';
import { describe, expect, test, vi } from 'vitest';
import { DefaultDebuggerSessions } from '../Debugging/DefaultDebuggerSessions';
import { ChildSessionAttachedHandler } from './ChildSessionAttachedHandler';
import { Result } from '../../../Common/Results/Result';
import { createLogger } from '../../../TestData';
import { createDebuggerClientMock } from '../../BackgroundTestData';

function anAttachedEvent(isWaitingForDebugger: boolean): Protocol.Target.AttachedToTargetEvent {
    return {
        sessionId: 'session-a',
        targetInfo: {
            targetId: 'iframe-1',
            type: 'iframe',
            title: '',
            url: 'https://widget.example.com/embed',
            attached: true,
            canAccessOpener: false,
        },
        waitingForDebugger: isWaitingForDebugger,
    };
}

function setUp(prepared: Result<void>) {
    const debuggerMock = createDebuggerClientMock();
    const sessions = new DefaultDebuggerSessions();
    const preparer = {
        prepareAsync: vi.fn().mockResolvedValue(prepared),
    };
    const logger = createLogger();
    const handler = new ChildSessionAttachedHandler({
        debuggerClient: debuggerMock.client,
        sessions,
        preparer,
        logger,
    });

    return {
        sendToSession: vi.mocked(debuggerMock.client.sendToSessionAsync),
        sessions,
        preparer,
        logger,
        handler,
    };
}

describe('ChildSessionAttachedHandler', () => {
    test('handleAsync_WhenAnIframeWaits_ShouldPrepareItThenLetItRun', async () => {
        // Arrange
        const { sendToSession, sessions, preparer, handler } = setUp(Result.done());

        // Act
        await handler.handleAsync(
            /* tabId: */ 1,
            /* params: */ anAttachedEvent(true),
        );

        // Assert
        expect(sessions.childrenOf(1)).toEqual(['session-a']);
        expect(preparer.prepareAsync).toHaveBeenCalledWith(1, 'session-a');
        expect(sendToSession).toHaveBeenCalledWith(
            /* tabId: */ 1,
            /* sessionId: */ 'session-a',
            /* command: */ 'Runtime.runIfWaitingForDebugger',
        );
    });

    test('handleAsync_WhenPreparingFails_ShouldWarnAndStillLetItRun', async () => {
        // Arrange
        const { sendToSession, logger, handler } = setUp(Result.fail('Network.enable failed: closed'));

        // Act
        await handler.handleAsync(
            /* tabId: */ 1,
            /* params: */ anAttachedEvent(true),
        );

        // Assert
        expect(logger.warn).toHaveBeenCalledWith(
            /* message: */ 'Capturing the iframe https://widget.example.com/embed failed.',
            /* context: */ 'Network.enable failed: closed',
        );
        expect(sendToSession).toHaveBeenCalledWith(
            /* tabId: */ 1,
            /* sessionId: */ 'session-a',
            /* command: */ 'Runtime.runIfWaitingForDebugger',
        );
    });

    test('handleAsync_WhenTheIframeIsNotWaiting_ShouldNotResumeIt', async () => {
        // Arrange
        const { sendToSession, handler } = setUp(Result.done());

        // Act
        await handler.handleAsync(
            /* tabId: */ 1,
            /* params: */ anAttachedEvent(false),
        );

        // Assert
        expect(sendToSession).not.toHaveBeenCalled();
    });
});
