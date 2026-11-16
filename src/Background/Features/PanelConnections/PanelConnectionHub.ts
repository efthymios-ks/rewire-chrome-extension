import type { WorkerEvent } from '../../../Contracts/Messaging/WorkerEvent';
import type { PanelConnection } from './PanelConnection';

export interface PanelConnectionHub {
    add(port: chrome.runtime.Port): PanelConnection;
    remove(connectionId: string): PanelConnection | undefined;
    assignTab(connectionId: string, tabId: number): number | null;
    isTabInspected(tabId: number): boolean;
    hasConnections(): boolean;
    send(connection: PanelConnection, event: WorkerEvent): void;
    publishToTab(tabId: number, event: WorkerEvent): void;
}
