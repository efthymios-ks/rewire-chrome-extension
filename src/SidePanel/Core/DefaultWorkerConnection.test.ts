import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Result } from '../../Common/Results/Result';
import { PANEL_COMMAND_TYPE } from '../../Contracts/Messaging/PanelCommandType';
import { PANEL_PORT_NAME } from '../../Contracts/Messaging/PanelPortName';
import type { PanelRequest } from '../../Contracts/Messaging/PanelRequest';
import type { WorkerEvent } from '../../Contracts/Messaging/WorkerEvent';
import { WORKER_EVENT_TYPE } from '../../Contracts/Messaging/WorkerEventType';
import { DefaultWorkerConnection } from './DefaultWorkerConnection';
import { PANEL_LIMITS } from './PanelLimits';
import { createLogger } from '../../TestData';

const KEEP_ALIVE = Object.freeze({
    type: PANEL_COMMAND_TYPE.KeepAlive,
});

interface FakePort {
    postMessage: ReturnType<typeof vi.fn>;
    receive(event: WorkerEvent): void;
    disconnect(): void;
}

function aFakePort(): FakePort {
    const messageListeners: Array<(message: unknown) => void> = [];
    const disconnectListeners: Array<() => void> = [];
    const port = {
        postMessage: vi.fn(),
        onMessage: {
            addListener: (listener: (message: unknown) => void) => messageListeners.push(listener),
        },
        onDisconnect: {
            addListener: (listener: () => void) => disconnectListeners.push(listener),
        },
    };

    return Object.assign(port, {
        receive: (event: WorkerEvent) => messageListeners.forEach(listener => listener(event)),
        disconnect: () => disconnectListeners.forEach(listener => listener()),
    });
}

function stubChrome(connect: ReturnType<typeof vi.fn>): void {
    vi.stubGlobal('chrome', {
        runtime: {
            connect,
        },
    });
}

function setUp() {
    const port = aFakePort();
    const connect = vi.fn().mockReturnValue(port);
    stubChrome(connect);
    const logger = createLogger();
    const connection = new DefaultWorkerConnection(logger);
    connection.start();

    return {
        port,
        connect,
        logger,
        connection,
    };
}

function lastRequestOf(port: FakePort): PanelRequest {
    return port.postMessage.mock.lastCall?.[0] as PanelRequest;
}

describe('DefaultWorkerConnection', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    test('start_WhenCalled_ShouldConnectToThePanelPort', () => {
        // Arrange
        const connect = vi.fn().mockReturnValue(aFakePort());
        stubChrome(connect);

        // Act
        new DefaultWorkerConnection(createLogger()).start();

        // Assert
        expect(connect).toHaveBeenCalledWith({
            name: PANEL_PORT_NAME,
        });
    });

    test('start_WhenTheKeepAliveIntervalPasses_ShouldPingTheWorker', () => {
        // Arrange
        const { port } = setUp();

        // Act
        vi.advanceTimersByTime(PANEL_LIMITS.KeepAliveIntervalInMilliseconds);

        // Assert
        expect(lastRequestOf(port).command).toEqual(KEEP_ALIVE);
    });

    test('start_WhenConnectingThrows_ShouldLogTheFailure', () => {
        // Arrange
        stubChrome(vi.fn().mockImplementation(() => {
            throw new Error('Extension context invalidated.');
        }));
        const logger = createLogger();

        // Act
        new DefaultWorkerConnection(logger).start();

        // Assert
        expect(logger.error).toHaveBeenCalledWith(
            /* message: */ 'Connecting to the extension worker failed.',
            /* context: */ 'Extension context invalidated.',
        );
    });

    test('sendAsync_WhenNotConnected_ShouldFail', async () => {
        // Arrange
        const connection = new DefaultWorkerConnection(createLogger());

        // Act
        const result = await connection.sendAsync(KEEP_ALIVE);

        // Assert
        expect(result).toEqual(Result.fail("The extension worker isn't connected yet."));
    });

    test('sendAsync_WhenTheWorkerCompletesTheCommand_ShouldResolveWithItsResult', async () => {
        // Arrange
        const { port, connection } = setUp();
        const pending = connection.sendAsync(KEEP_ALIVE);
        const request = lastRequestOf(port);

        // Act
        port.receive({
            type: WORKER_EVENT_TYPE.CommandCompleted,
            correlationId: request.correlationId,
            result: Result.done(),
        });

        // Assert
        expect(request.command).toEqual(KEEP_ALIVE);
        expect(await pending).toEqual(Result.done());
    });

    test('sendAsync_WhenTheWorkerNeverAnswers_ShouldTimeOut', async () => {
        // Arrange
        const { connection } = setUp();
        const pending = connection.sendAsync(KEEP_ALIVE);

        // Act
        vi.advanceTimersByTime(PANEL_LIMITS.CommandTimeoutInMilliseconds);

        // Assert
        expect(await pending).toEqual(Result.fail("The extension worker didn't answer in time."));
    });

    test('sendAsync_WhenPostingThrows_ShouldFailWithTheError', async () => {
        // Arrange
        const { port, connection } = setUp();
        port.postMessage.mockImplementation(() => {
            throw new Error('Attempting to use a disconnected port object');
        });

        // Act
        const result = await connection.sendAsync(KEEP_ALIVE);

        // Assert
        expect(result).toEqual(Result.fail('Attempting to use a disconnected port object'));
    });

    test('sendAsync_WhenThePortDisconnects_ShouldFailThePendingCommands', async () => {
        // Arrange
        const { port, connection } = setUp();
        const pending = connection.sendAsync(KEEP_ALIVE);

        // Act
        port.disconnect();

        // Assert
        expect(await pending).toEqual(Result.fail('The extension worker restarted.'));
    });

    test('onEvent_WhenTheWorkerPushesAnEvent_ShouldNotifyEveryListener', () => {
        // Arrange
        const { port, connection } = setUp();
        const first = vi.fn();
        const second = vi.fn();
        connection.onEvent(first);
        connection.onEvent(second);
        const event: WorkerEvent = {
            type: WORKER_EVENT_TYPE.TimelineCleared,
            tabId: 7,
        };

        // Act
        port.receive(event);

        // Assert
        expect(first).toHaveBeenCalledWith(event);
        expect(second).toHaveBeenCalledWith(event);
    });

    test('onEvent_WhenACommandCompletes_ShouldNotNotifyListeners', () => {
        // Arrange
        const { port, connection } = setUp();
        const listener = vi.fn();
        connection.onEvent(listener);

        // Act
        port.receive({
            type: WORKER_EVENT_TYPE.CommandCompleted,
            correlationId: 'unknown',
            result: Result.done(),
        });

        // Assert
        expect(listener).not.toHaveBeenCalled();
    });

    test('onReconnect_WhenThePortDisconnects_ShouldReconnectAfterTheDelayAndNotify', () => {
        // Arrange
        const { port, connect, connection } = setUp();
        const listener = vi.fn();
        connection.onReconnect(listener);
        port.disconnect();

        // Act
        vi.advanceTimersByTime(PANEL_LIMITS.ReconnectDelayInMilliseconds);

        // Assert
        expect(connect).toHaveBeenCalledTimes(2);
        expect(listener).toHaveBeenCalledOnce();
    });

    test('onReconnect_WhenConnectingTheFirstTime_ShouldNotNotify', () => {
        // Arrange
        const connect = vi.fn().mockReturnValue(aFakePort());
        stubChrome(connect);
        const connection = new DefaultWorkerConnection(createLogger());
        const listener = vi.fn();
        connection.onReconnect(listener);

        // Act
        connection.start();

        // Assert
        expect(listener).not.toHaveBeenCalled();
    });

    test('sendAsync_WhenDisconnectedAndNotYetReconnected_ShouldFail', async () => {
        // Arrange
        const { port, connection } = setUp();
        port.disconnect();

        // Act
        const result = await connection.sendAsync(KEEP_ALIVE);

        // Assert
        expect(result).toEqual(Result.fail("The extension worker isn't connected yet."));
    });
});
