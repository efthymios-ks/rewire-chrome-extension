import { describe, expect, test, vi } from 'vitest';
import { DefaultClientRequestSender } from './DefaultClientRequestSender';
import type { PanelTargetClient } from './PanelTargetClient';
import { Result } from '../../../Common/Results/Result';
import type { SentClientRequest } from '../../../Contracts/Messaging/Commands/SentClientRequest';
import { createLogger, nextTaskAsync } from '../../../TestData';

const PANEL_TARGET = 'panel-target';
const MARKER_PATTERN = /"x-rewire-send":"([^"]+)"/;
const TARGETS_ERROR = 'Cannot access the debugger targets.';

interface SentCommand {
    command: string;
    params: Record<string, unknown> | undefined;
}

interface TargetCommand {
    targetId: string;
    command: string;
}

interface SenderSetUp {
    sender: DefaultClientRequestSender;
    client: PanelTargetClient;
    sent: SentCommand[];
}

function aRequest(changes: Partial<SentClientRequest> = {}): SentClientRequest {
    return {
        method: 'GET',
        url: 'https://login.example.com/token',
        headers: [
            {
                name: 'Content-Type',
                value: 'application/x-www-form-urlencoded',
            },
            {
                name: 'Cookie',
                value: 'session=abc',
            },
        ],
        bodyBase64: btoa('client_id=app&grant_type=client_credentials'),
        ...changes,
    };
}

function setUp(evaluation: unknown = {
    status: 200,
    statusText: 'OK',
    headers: [
        {
            name: 'content-type',
            value: 'application/json',
        },
    ],
    body: '{"access_token":"x"}',
    durationInMilliseconds: 42,
}, target: string | null = PANEL_TARGET): SenderSetUp {
    const sent: SentCommand[] = [];
    let sender: DefaultClientRequestSender | null = null;
    const client: PanelTargetClient = {
        findPanelTargetAsync: vi.fn().mockResolvedValue(Result.ok(target)),
        attachAsync: vi.fn().mockResolvedValue(Result.done()),
        sendAsync: vi.fn(async (
            _targetId: string,
            command: string,
            params?: Record<string, unknown>,
        ) => {
            sent.push({
                command,
                params,
            });
            if (command !== 'Runtime.evaluate') {
                return Result.ok({});
            }

            const sendId = MARKER_PATTERN.exec(String(params?.['expression']))?.[1] ?? '';
            sender!.handleEvent(
                /* targetId: */ PANEL_TARGET,
                /* method: */ 'Fetch.requestPaused',
                /* params: */ {
                    requestId: 'paused-1',
                    request: {
                        headers: {
                            'Accept': '*/*',
                            'Content-Type': 'text/plain;charset=UTF-8',
                            'x-rewire-send': sendId,
                        },
                    },
                },
            );
            await nextTaskAsync();

            return Result.ok({
                result: {
                    value: evaluation,
                },
            });
        }) as PanelTargetClient['sendAsync'],
    };
    sender = new DefaultClientRequestSender(
        /* client: */ client,
        /* logger: */ createLogger(),
    );

    return {
        sender,
        client,
        sent,
    };
}

function commandsOf(sent: SentCommand[]): string[] {
    return sent.map(entry => entry.command);
}

function setUpConcurrentSends(targetIds: string[]) {
    const sent: TargetCommand[] = [];
    const pendingEnables: Array<() => void> = [];
    const client: PanelTargetClient = {
        findPanelTargetAsync: vi.fn(async () => Result.ok(targetIds.shift() ?? null)),
        attachAsync: vi.fn().mockResolvedValue(Result.done()),
        sendAsync: vi.fn(async (targetId: string, command: string) => {
            sent.push({
                targetId,
                command,
            });
            if (command === 'Fetch.enable') {
                await new Promise<void>(resolve => pendingEnables.push(resolve));
            }

            return command === 'Runtime.evaluate'
                ? Result.ok({
                    result: {
                        value: {
                            status: 200,
                        },
                    },
                })
                : Result.ok({});
        }) as PanelTargetClient['sendAsync'],
    };

    return {
        sender: new DefaultClientRequestSender(
            /* client: */ client,
            /* logger: */ createLogger(),
        ),
        sent,
        finishEnabling: () => pendingEnables
            .splice(0)
            .forEach(resolve => resolve()),
    };
}

describe('DefaultClientRequestSender', () => {
    test('sendAsync_WhenAGetHasABody_ShouldRewriteThePausedRequestAndReturnTheAnswer', async () => {
        // Arrange
        const { sender, sent } = setUp();
        const request = aRequest();

        // Act
        const result = await sender.sendAsync(request);

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: {
                status: 200,
                statusText: 'OK',
                headers: [
                    {
                        name: 'content-type',
                        value: 'application/json',
                    },
                ],
                body: '{"access_token":"x"}',
                durationInMilliseconds: 42,
            },
        });
        expect(commandsOf(sent)).toEqual([
            'Fetch.enable',
            'Runtime.evaluate',
            'Fetch.continueRequest',
            'Fetch.disable',
        ]);
        expect(sent[2]?.params).toEqual({
            requestId: 'paused-1',
            method: 'GET',
            headers: [
                {
                    name: 'Accept',
                    value: '*/*',
                },
                {
                    name: 'Content-Type',
                    value: 'application/x-www-form-urlencoded',
                },
                {
                    name: 'Cookie',
                    value: 'session=abc',
                },
            ],
            postData: request.bodyBase64,
        });
    });

    test('sendAsync_WhenSentTwice_ShouldAttachToThePanelOnce', async () => {
        // Arrange
        const { sender, client } = setUp();
        await sender.sendAsync(aRequest());

        // Act
        await sender.sendAsync(aRequest());

        // Assert
        expect(client.attachAsync).toHaveBeenCalledOnce();
        expect(client.attachAsync).toHaveBeenCalledWith(PANEL_TARGET);
    });

    test('sendAsync_WhenThePanelWasDetached_ShouldAttachAgain', async () => {
        // Arrange
        const { sender, client } = setUp();
        await sender.sendAsync(aRequest());
        sender.handleDetach(PANEL_TARGET);

        // Act
        await sender.sendAsync(aRequest());

        // Assert
        expect(client.attachAsync).toHaveBeenCalledTimes(2);
    });

    test('sendAsync_WhenNoPanelIsOpen_ShouldSaySo', async () => {
        // Arrange
        const { sender } = setUp(undefined, null);

        // Act
        const result = await sender.sendAsync(aRequest());

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Open the Rewire side panel to send this request.',
        });
    });

    test('sendAsync_WhenThePanelCannotBeAttached_ShouldReturnWhy', async () => {
        // Arrange
        const { sender, client } = setUp();
        vi.mocked(client.attachAsync).mockResolvedValue(Result.fail('Another debugger is already attached.'));

        // Act
        const result = await sender.sendAsync(aRequest());

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Another debugger is already attached.',
        });
    });

    test('sendAsync_WhenTheRequestFails_ShouldReturnTheBrowserError', async () => {
        // Arrange
        const { sender } = setUp({
            error: 'Failed to fetch',
        });

        // Act
        const result = await sender.sendAsync(aRequest());

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Failed to fetch',
        });
    });

    test('handleEvent_WhenAnotherPanelRequestPauses_ShouldLetItGoUnchanged', async () => {
        // Arrange
        const { sender, sent } = setUp();

        // Act
        sender.handleEvent(
            /* targetId: */ PANEL_TARGET,
            /* method: */ 'Fetch.requestPaused',
            /* params: */ {
                requestId: 'other-1',
                request: {
                    headers: {
                        Accept: '*/*',
                    },
                },
            },
        );
        await nextTaskAsync();

        // Assert
        expect(sent).toEqual([
            {
                command: 'Fetch.continueRequest',
                params: {
                    requestId: 'other-1',
                    headers: undefined,
                },
            },
        ]);
    });

    test('handleEvent_WhenTheEventIsNotAPausedRequest_ShouldIgnoreIt', () => {
        // Arrange
        const { sender, sent } = setUp();

        // Act
        sender.handleEvent(
            /* targetId: */ PANEL_TARGET,
            /* method: */ 'Network.requestWillBeSent',
            /* params: */ {},
        );

        // Assert
        expect(sent).toEqual([]);
    });

    test('sendAsync_WhenThePanelTargetsCannotBeListed_ShouldReturnWhy', async () => {
        // Arrange
        const { sender, client } = setUp();
        vi.mocked(client.findPanelTargetAsync).mockResolvedValue(Result.fail(TARGETS_ERROR));

        // Act
        const result = await sender.sendAsync(aRequest());

        // Assert
        expect(result).toEqual(Result.fail(TARGETS_ERROR));
    });

    test('sendAsync_WhenTwoTargetsSendAtOnce_ShouldInterceptOnEach', async () => {
        // Arrange
        const { sender, sent, finishEnabling } = setUpConcurrentSends([
            'panel-a',
            'panel-b',
        ]);
        const firstSend = sender.sendAsync(aRequest());
        const secondSend = sender.sendAsync(aRequest());
        await nextTaskAsync();

        // Act
        finishEnabling();
        await Promise.all([
            firstSend,
            secondSend,
        ]);

        // Assert
        const enabledTargets = sent
            .filter(entry => entry.command === 'Fetch.enable')
            .map(entry => entry.targetId);
        const disabledTargets = sent
            .filter(entry => entry.command === 'Fetch.disable')
            .map(entry => entry.targetId);
        expect(enabledTargets).toEqual([
            'panel-a',
            'panel-b',
        ]);
        expect(disabledTargets).toEqual([
            'panel-a',
            'panel-b',
        ]);
    });

    test('sendAsync_WhenTheSameTargetSendsTwiceAtOnce_ShouldWaitForInterceptionBeforeSending', async () => {
        // Arrange
        const { sender, sent, finishEnabling } = setUpConcurrentSends([
            PANEL_TARGET,
            PANEL_TARGET,
        ]);
        const firstSend = sender.sendAsync(aRequest());
        const secondSend = sender.sendAsync(aRequest());

        // Act
        await nextTaskAsync();
        const commandsWhileEnabling = sent.map(entry => entry.command);
        finishEnabling();
        await Promise.all([
            firstSend,
            secondSend,
        ]);

        // Assert
        expect(commandsWhileEnabling).toEqual(['Fetch.enable']);
        expect(sent.map(entry => entry.command)).toEqual([
            'Fetch.enable',
            'Runtime.evaluate',
            'Runtime.evaluate',
            'Fetch.disable',
        ]);
    });
});
