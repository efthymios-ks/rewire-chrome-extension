import { ErrorText } from "../../../Common/Errors/ErrorText";
import type { ILogger } from "../../../Common/Logging/ILogger";
import type { WorkerEvent } from "../../../Contracts/Messaging/WorkerEvent";
import type { PanelConnection } from "./PanelConnection";

export interface IPanelConnectionHub {
    add(port: chrome.runtime.Port): PanelConnection;
    remove(connectionId: string): PanelConnection | undefined;
    inspect(connectionId: string, tabId: number): number | null;
    isTabInspected(tabId: number): boolean;
    hasConnections(): boolean;
    send(connection: PanelConnection, event: WorkerEvent): void;
    publishToTab(tabId: number, event: WorkerEvent): void;
}

export class PanelConnectionHub implements IPanelConnectionHub {
    private readonly _connections = new Map<string, PanelConnection>();
    private readonly _logger: ILogger;

    constructor(logger: ILogger) {
        this._logger = logger;
    }

    add(port: chrome.runtime.Port): PanelConnection {
        const connection: PanelConnection = {
            id: crypto.randomUUID(),
            port,
            tabId: null,
        };
        this._connections.set(connection.id, connection);

        return connection;
    }

    remove(connectionId: string): PanelConnection | undefined {
        const connection = this._connections.get(connectionId);
        this._connections.delete(connectionId);

        return connection;
    }

    inspect(connectionId: string, tabId: number): number | null {
        const connection = this._connections.get(connectionId);
        if (connection === undefined) {
            return null;
        }

        const previousTabId = connection.tabId;
        connection.tabId = tabId;

        return previousTabId;
    }

    isTabInspected(tabId: number): boolean {
        return [...this._connections.values()].some(connection => connection.tabId === tabId);
    }

    hasConnections(): boolean {
        return this._connections.size > 0;
    }

    send(connection: PanelConnection, event: WorkerEvent): void {
        try {
            connection.port.postMessage(event);
        } catch (error) {
            this._logger.warn(`Panel ${connection.id} is gone: ${ErrorText.of(error)}`);
            this._connections.delete(connection.id);
        }
    }

    publishToTab(tabId: number, event: WorkerEvent): void {
        [...this._connections.values()]
            .filter(connection => connection.tabId === tabId)
            .forEach(connection => this.send(connection, event));
    }
}
