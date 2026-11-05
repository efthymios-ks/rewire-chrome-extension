import { ErrorText } from "../../Common/Errors/ErrorText";
import type { ILogger } from "../../Common/Logging/ILogger";
import { Result } from "../../Common/Results/Result";
import type { PanelCommandOf } from "../../Contracts/Messaging/PanelCommand";
import type { PanelCommandResults } from "../../Contracts/Messaging/PanelCommandResults";
import { PanelCommandType } from "../../Contracts/Messaging/PanelCommandType";
import { PanelPortName } from "../../Contracts/Messaging/PanelPortName";
import type { PanelRequest } from "../../Contracts/Messaging/PanelRequest";
import type { WorkerEvent } from "../../Contracts/Messaging/WorkerEvent";
import { WorkerEventType } from "../../Contracts/Messaging/WorkerEventType";
import { PanelLimits } from "./PanelLimits";

type PendingCommand = (result: Result<unknown>) => void;

export interface IWorkerConnection {
    send<TCommandType extends PanelCommandType>(command: PanelCommandOf<TCommandType>): Promise<Result<PanelCommandResults[TCommandType]>>;
    onEvent(listener: (event: WorkerEvent) => void): void;
    onReconnect(listener: () => void): void;
}

export class WorkerConnection implements IWorkerConnection {
    private readonly _logger: ILogger;
    private readonly _pendingCommands = new Map<string, PendingCommand>();
    private readonly _eventListeners: Array<(event: WorkerEvent) => void> = [];
    private readonly _reconnectListeners: Array<() => void> = [];
    private _port: chrome.runtime.Port | null = null;
    private _hasConnected = false;

    constructor(logger: ILogger) {
        this._logger = logger;
    }

    start(): void {
        this.connect();
        setInterval(
            () => void this.send<PanelCommandType.KeepAlive>({
                type: PanelCommandType.KeepAlive,
            }),
            PanelLimits.KeepAliveIntervalInMilliseconds
        );
    }

    send<TCommandType extends PanelCommandType>(command: PanelCommandOf<TCommandType>): Promise<Result<PanelCommandResults[TCommandType]>> {
        const port = this._port;
        if (port === null) {
            return Promise.resolve(Result.fail("The extension worker isn't connected yet."));
        }

        const request: PanelRequest = {
            correlationId: crypto.randomUUID(),
            command,
        };

        return new Promise(resolve => {
            const timeout = setTimeout(
                () => this.complete(request.correlationId, Result.fail("The extension worker didn't answer in time.")),
                PanelLimits.CommandTimeoutInMilliseconds
            );
            this._pendingCommands.set(
                request.correlationId,
                result => {
                    clearTimeout(timeout);
                    resolve(result as Result<PanelCommandResults[TCommandType]>);
                }
            );

            try {
                port.postMessage(request);
            } catch (error) {
                this.complete(request.correlationId, Result.fail(ErrorText.of(error)));
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
                name: PanelPortName,
            });
            port.onMessage.addListener(message => this.receive(message as WorkerEvent));
            port.onDisconnect.addListener(() => this.handleDisconnect());
            this._port = port;
        } catch (error) {
            this._logger.error("Connecting to the extension worker failed.", ErrorText.of(error));

            return;
        }

        if (this._hasConnected) {
            this._reconnectListeners.forEach(listener => listener());
        }

        this._hasConnected = true;
    }

    private receive(event: WorkerEvent): void {
        if (event.type === WorkerEventType.CommandCompleted) {
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
        [...this._pendingCommands.keys()].forEach(correlationId => this.complete(correlationId, Result.fail("The extension worker restarted.")));
        setTimeout(() => this.connect(), PanelLimits.ReconnectDelayInMilliseconds);
    }
}
