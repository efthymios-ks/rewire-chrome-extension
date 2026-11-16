import { ErrorText } from '../../Common/Errors/ErrorText';
import type { Logger } from '../../Common/Logging/Logger';
import { Result } from '../../Common/Results/Result';
import type { PanelCommandOf } from '../../Contracts/Messaging/PanelCommand';
import type { PanelCommandResults } from '../../Contracts/Messaging/PanelCommandResults';
import { PANEL_COMMAND_TYPE, type PanelCommandType } from '../../Contracts/Messaging/PanelCommandType';
import { PANEL_PORT_NAME } from '../../Contracts/Messaging/PanelPortName';
import type { PanelRequest } from '../../Contracts/Messaging/PanelRequest';
import type { WorkerEvent } from '../../Contracts/Messaging/WorkerEvent';
import { WORKER_EVENT_TYPE } from '../../Contracts/Messaging/WorkerEventType';
import { PANEL_LIMITS } from './PanelLimits';
import type { WorkerConnection } from './WorkerConnection';

type PendingCommand = (result: Result<unknown>) => void;

export class DefaultWorkerConnection implements WorkerConnection {
    private readonly _logger: Logger;
    private readonly _pendingCommands = new Map<string, PendingCommand>();
    private readonly _eventListeners: Array<(event: WorkerEvent) => void> = [];
    private readonly _reconnectListeners: Array<() => void> = [];
    private _port: chrome.runtime.Port | null = null;
    private _hasConnected = false;

    constructor(logger: Logger) {
        this._logger = logger;
    }

    start(): void {
        this.connect();
        setInterval(
            /* callback: */ () => void this.sendAsync<typeof PANEL_COMMAND_TYPE.KeepAlive>({
                type: PANEL_COMMAND_TYPE.KeepAlive,
            }),
            /* delay: */ PANEL_LIMITS.KeepAliveIntervalInMilliseconds,
        );
    }

    sendAsync<TCommandType extends PanelCommandType>(
        command: PanelCommandOf<TCommandType>,
    ): Promise<Result<PanelCommandResults[TCommandType]>> {
        const port = this._port;
        if (port == null) {
            return Promise.resolve(Result.fail("The extension worker isn't connected yet."));
        }

        const request: PanelRequest = {
            correlationId: crypto.randomUUID(),
            command,
        };

        return new Promise(resolve => {
            const timeout = setTimeout(
                /* callback: */ () => this.complete(
                    /* correlationId: */ request.correlationId,
                    /* result: */ Result.fail("The extension worker didn't answer in time."),
                ),
                /* delay: */ PANEL_LIMITS.CommandTimeoutInMilliseconds,
            );
            this._pendingCommands.set(
                /* key: */ request.correlationId,
                /* value: */ result => {
                    clearTimeout(timeout);
                    resolve(result as Result<PanelCommandResults[TCommandType]>);
                },
            );

            try {
                port.postMessage(request);
            } catch (error) {
                this.complete(
                    /* correlationId: */ request.correlationId,
                    /* result: */ Result.fail(ErrorText.of(error)),
                );
            }
        });
    }

    onEvent(listener: (event: WorkerEvent) => void): void {
        this._eventListeners.push(listener);
    }

    onReconnect(listener: () => void): void {
        this._reconnectListeners.push(listener);
    }

    private connect(): void {
        try {
            const port = chrome.runtime.connect({
                name: PANEL_PORT_NAME,
            });
            port.onMessage.addListener(message => this.receive(message as WorkerEvent));
            port.onDisconnect.addListener(() => this.handleDisconnect());
            this._port = port;
        } catch (error) {
            this._logger.error(
                /* message: */ 'Connecting to the extension worker failed.',
                /* context: */ ErrorText.of(error),
            );

            return;
        }

        if (this._hasConnected) {
            this._reconnectListeners.forEach(listener => listener());
        }

        this._hasConnected = true;
    }

    private receive(event: WorkerEvent): void {
        if (event.type === WORKER_EVENT_TYPE.CommandCompleted) {
            this.complete(event.correlationId, event.result);

            return;
        }

        this._eventListeners.forEach(listener => listener(event));
    }

    private complete(correlationId: string, result: Result<unknown>): void {
        const pending = this._pendingCommands.get(correlationId);
        this._pendingCommands.delete(correlationId);
        pending?.(result);
    }

    private handleDisconnect(): void {
        this._port = null;
        [...this._pendingCommands.keys()]
            .forEach(correlationId => this.complete(
                /* correlationId: */ correlationId,
                /* result: */ Result.fail('The extension worker restarted.'),
            ));
        setTimeout(() => this.connect(), PANEL_LIMITS.ReconnectDelayInMilliseconds);
    }
}
