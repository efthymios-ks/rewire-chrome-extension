import { ErrorText } from '../../Common/Errors/ErrorText';
import type { Logger } from '../../Common/Logging/Logger';
import type { InspectedTab } from './InspectedTab';

export interface InspectedTabListener {
    onChanged(tab: InspectedTab | null): void;
    onUpdated(tab: InspectedTab): void;
}

function toInspectedTab(tab: chrome.tabs.Tab, tabId: number): InspectedTab {
    const url = tab.url ?? '';
    const pendingUrl = tab.pendingUrl ?? '';

    return {
        tabId,
        url: url === '' ? pendingUrl : url,
        title: tab.title ?? '',
    };
}

export class InspectedTabTracker {
    private readonly _logger: Logger;
    private _windowId: number | null = null;
    private _tabId: number | null = null;

    constructor(logger: Logger) {
        this._logger = logger;
    }

    async startAsync(listener: InspectedTabListener): Promise<void> {
        chrome.tabs.onActivated.addListener(activeInfo => {
            if (activeInfo.windowId !== this._windowId) {
                return;
            }

            void this.refreshAsync(listener);
        });

        chrome.tabs.onUpdated.addListener((
            tabId,
            changeInfo,
            tab,
        ) => {
            if (tabId !== this._tabId || (changeInfo.url == null && changeInfo.title == null)) {
                return;
            }

            listener.onUpdated(toInspectedTab(tab, tabId));
        });

        try {
            const currentWindow = await chrome.windows.getCurrent();
            this._windowId = currentWindow.id ?? null;
        } catch (error) {
            this._logger.error(
                /* message: */ 'Reading the panel window failed.',
                /* context: */ ErrorText.of(error),
            );
        }

        await this.refreshAsync(listener);
    }

    private async refreshAsync(listener: InspectedTabListener): Promise<void> {
        const activeTabs = await this.queryActiveTabsAsync();
        if (activeTabs == null) {
            return;
        }

        const [activeTab] = activeTabs;
        const tabId = activeTab?.id;
        if (activeTab == null || tabId == null) {
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

    private async queryActiveTabsAsync(): Promise<chrome.tabs.Tab[] | null> {
        try {
            return await chrome.tabs.query({
                active: true,
                windowId: this._windowId ?? chrome.windows.WINDOW_ID_CURRENT,
            });
        } catch (error) {
            this._logger.error(
                /* message: */ 'Reading the active tab failed.',
                /* context: */ ErrorText.of(error),
            );

            return null;
        }
    }
}
