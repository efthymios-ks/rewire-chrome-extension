import { ErrorText } from "../../Common/Errors/ErrorText";
import type { ILogger } from "../../Common/Logging/ILogger";
import type { InspectedTab } from "./InspectedTab";

export interface InspectedTabListener {
    onChanged(tab: InspectedTab | null): void;
    onUpdated(tab: InspectedTab): void;
}

function toInspectedTab(tab: chrome.tabs.Tab, tabId: number): InspectedTab {
    return {
        tabId,
        url: tab.url || tab.pendingUrl || "",
        title: tab.title ?? "",
    };
}

export class InspectedTabTracker {
    private readonly _logger: ILogger;
    private _windowId: number | null = null;
    private _tabId: number | null = null;

    constructor(logger: ILogger) {
        this._logger = logger;
    }

    async start(listener: InspectedTabListener): Promise<void> {
        chrome.tabs.onActivated.addListener(activeInfo => {
            if (activeInfo.windowId !== this._windowId) {
                return;
            }

            void this.refresh(listener);
        });

        chrome.tabs.onUpdated.addListener((
            tabId,
            changeInfo,
            tab
        ) => {
            if (tabId !== this._tabId || (changeInfo.url === undefined && changeInfo.title === undefined)) {
                return;
            }

            listener.onUpdated(toInspectedTab(tab, tabId));
        });

        try {
            const currentWindow = await chrome.windows.getCurrent();
            this._windowId = currentWindow.id ?? null;
        } catch (error) {
            this._logger.error("Reading the panel window failed.", ErrorText.of(error));
        }

        await this.refresh(listener);
    }

    private async refresh(listener: InspectedTabListener): Promise<void> {
        let activeTab: chrome.tabs.Tab | undefined;
        try {
            [activeTab] = await chrome.tabs.query({
                active: true,
                windowId: this._windowId ?? chrome.windows.WINDOW_ID_CURRENT,
            });
        } catch (error) {
            this._logger.error("Reading the active tab failed.", ErrorText.of(error));

            return;
        }

        const tabId = activeTab?.id;
        if (activeTab === undefined || tabId === undefined) {
            this._tabId = null;
            listener.onChanged(null);

            return;
        }

        if (tabId === this._tabId) {
            return;
        }

        this._tabId = tabId;
        listener.onChanged(toInspectedTab(activeTab, tabId));
    }
}
