export class KeptTimelines {
    private readonly _maxTabs: number;
    private _tabIds: number[] = [];

    constructor(maxTabs: number) {
        this._maxTabs = maxTabs;
    }

    keep(tabId: number): number[] {
        this._tabIds = [
            ...this._tabIds.filter(keptTabId => keptTabId !== tabId),
            tabId,
        ];
        const dropped = this._tabIds.slice(0, Math.max(0, this._tabIds.length - this._maxTabs));
        this._tabIds = this._tabIds.slice(dropped.length);

        return dropped;
    }

    resume(tabId: number): void {
        this._tabIds = this._tabIds.filter(keptTabId => keptTabId !== tabId);
    }

    takeAll(): number[] {
        const all = this._tabIds;
        this._tabIds = [];

        return all;
    }
}
