export interface PanelConnection {
    readonly id: string;
    readonly port: chrome.runtime.Port;
    tabId: number | null;
}
