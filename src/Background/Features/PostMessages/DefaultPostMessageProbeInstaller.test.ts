import { describe, expect, test, vi } from 'vitest';
import type { DebuggerClient } from '../Debugging/DebuggerClient';
import { DefaultPostMessageProbeInstaller } from './DefaultPostMessageProbeInstaller';
import { POST_MESSAGE_BINDING_NAME } from './PostMessageBindingName';
import { PostMessageProbe } from './PostMessageProbe';
import { Result } from '../../../Common/Results/Result';
import { createDebuggerClientMock } from '../../BackgroundTestData';

const PROBE_SCRIPT_ID = 'probe-script';
const REMOVAL_SCRIPT_ID = 'removal-script';

function setUp() {
    const debuggerMock = createDebuggerClientMock();
    const sendToSession = vi.mocked(debuggerMock.client.sendToSessionAsync);
    const respondAsync = async (
        _tabId: number,
        _sessionId: string | null,
        command: string,
        params?: {
            source?: string;
        },
    ): Promise<Result<unknown>> => command === 'Page.addScriptToEvaluateOnNewDocument'
        ? Result.ok({
            identifier: params?.source === PostMessageProbe.source ? PROBE_SCRIPT_ID : REMOVAL_SCRIPT_ID,
        })
        : Result.ok({});
    sendToSession.mockImplementation(respondAsync as unknown as DebuggerClient['sendToSessionAsync']);

    return {
        sendToSession,
        installer: new DefaultPostMessageProbeInstaller(debuggerMock.client),
    };
}

describe('DefaultPostMessageProbeInstaller', () => {
    test('installAsync_WhenASessionListens_ShouldAddTheBindingAndRunTheProbeInEveryFrame', async () => {
        // Arrange
        const { sendToSession, installer } = setUp();

        // Act
        const result = await installer.installAsync(7, 'session-a');

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(sendToSession.mock.calls.map(call => call.slice(1))).toEqual([
            [
                'session-a',
                'Runtime.enable',
            ],
            [
                'session-a',
                'Runtime.addBinding',
                {
                    name: POST_MESSAGE_BINDING_NAME,
                },
            ],
            [
                'session-a',
                'Page.addScriptToEvaluateOnNewDocument',
                {
                    source: PostMessageProbe.source,
                    runImmediately: true,
                },
            ],
        ]);
    });

    test('installAsync_WhenTheBindingFails_ShouldStopAndReturnTheError', async () => {
        // Arrange
        const { sendToSession, installer } = setUp();
        sendToSession
            .mockResolvedValueOnce(Result.ok({}))
            .mockResolvedValueOnce(Result.fail('Runtime.addBinding failed: closed'));

        // Act
        const result = await installer.installAsync(7, null);

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Runtime.addBinding failed: closed',
        });
        expect(sendToSession).toHaveBeenCalledTimes(2);
    });

    test('uninstallAsync_WhenListeningStops_ShouldRemoveTheListenerEverywhereThenTheBinding', async () => {
        // Arrange
        const { sendToSession, installer } = setUp();
        await installer.installAsync(7, null);
        sendToSession.mockClear();

        // Act
        await installer.uninstallAsync(7, null);

        // Assert
        expect(sendToSession.mock.calls.map(call => call.slice(1))).toEqual([
            [
                null,
                'Page.removeScriptToEvaluateOnNewDocument',
                {
                    identifier: PROBE_SCRIPT_ID,
                },
            ],
            [
                null,
                'Page.addScriptToEvaluateOnNewDocument',
                {
                    source: PostMessageProbe.removalSource,
                    runImmediately: true,
                },
            ],
            [
                null,
                'Page.removeScriptToEvaluateOnNewDocument',
                {
                    identifier: REMOVAL_SCRIPT_ID,
                },
            ],
            [
                null,
                'Runtime.removeBinding',
                {
                    name: POST_MESSAGE_BINDING_NAME,
                },
            ],
            [
                null,
                'Runtime.disable',
            ],
        ]);
    });
});
