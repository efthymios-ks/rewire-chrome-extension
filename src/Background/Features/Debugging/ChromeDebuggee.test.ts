import { afterEach, describe, expect, test, vi } from 'vitest';
import { Result } from '../../../Common/Results/Result';
import { ChromeDebuggee } from './ChromeDebuggee';

function stubChrome() {
    const attach = vi.fn().mockResolvedValue(undefined);
    const sendCommand = vi.fn().mockResolvedValue({});
    vi.stubGlobal('chrome', {
        debugger: {
            attach,
            sendCommand,
        },
    });

    return {
        attach,
        sendCommand,
    };
}

describe('ChromeDebuggee', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('attachAsync_WhenTheDebuggerAttaches_ShouldRequireProtocolVersion13', async () => {
        // Arrange
        const { attach } = stubChrome();

        // Act
        const result = await ChromeDebuggee.attachAsync({ tabId: 3 });

        // Assert
        expect(result).toEqual(Result.done());
        expect(attach).toHaveBeenCalledWith(
            /* target: */ {
                tabId: 3,
            },
            /* requiredVersion: */ '1.3',
        );
    });

    test('attachAsync_WhenTheDebuggerRefuses_ShouldFailWithTheReason', async () => {
        // Arrange
        const { attach } = stubChrome();
        attach.mockRejectedValue(new Error('Another debugger is already attached'));

        // Act
        const result = await ChromeDebuggee.attachAsync({ targetId: 'panel-target' });

        // Assert
        expect(result).toEqual(Result.fail('Another debugger is already attached'));
    });

    test('sendCommandAsync_WhenTheCommandSucceeds_ShouldReturnTheResponse', async () => {
        // Arrange
        const { sendCommand } = stubChrome();
        sendCommand.mockResolvedValue({
            body: 'ok',
            base64Encoded: false,
        });

        // Act
        const result = await ChromeDebuggee.sendCommandAsync(
            /* target: */ {
                tabId: 3,
                sessionId: 'session-a',
            },
            /* command: */ 'Network.getResponseBody',
            /* params: */ {
                requestId: 'request-1',
            },
        );

        // Assert
        expect(result).toEqual(Result.ok({
            body: 'ok',
            base64Encoded: false,
        }));
        expect(sendCommand).toHaveBeenCalledWith(
            /* target: */ {
                tabId: 3,
                sessionId: 'session-a',
            },
            /* method: */ 'Network.getResponseBody',
            /* commandParams: */ {
                requestId: 'request-1',
            },
        );
    });

    test('sendCommandAsync_WhenTheCommandHasNoParams_ShouldSendUndefined', async () => {
        // Arrange
        const { sendCommand } = stubChrome();

        // Act
        await ChromeDebuggee.sendCommandAsync({ tabId: 3 }, 'Runtime.enable');

        // Assert
        expect(sendCommand).toHaveBeenCalledWith(
            /* target: */ {
                tabId: 3,
            },
            /* method: */ 'Runtime.enable',
            /* commandParams: */ undefined,
        );
    });

    test('sendCommandAsync_WhenTheCommandFails_ShouldNameTheCommand', async () => {
        // Arrange
        const { sendCommand } = stubChrome();
        sendCommand.mockRejectedValue(new Error('No target'));

        // Act
        const result = await ChromeDebuggee.sendCommandAsync({ targetId: 'panel-target' }, 'Runtime.enable');

        // Assert
        expect(result).toEqual(Result.fail('Runtime.enable failed: No target'));
    });
});
