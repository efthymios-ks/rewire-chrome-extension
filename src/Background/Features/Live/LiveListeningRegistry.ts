import { type LiveListening, NoLiveListening } from "../../../Contracts/Live/LiveListening";

export interface ILiveListeningRegistry {
    of(tabId: number): LiveListening;
    set(tabId: number, listening: LiveListening): void;
    forget(tabId: number): void;
}

export class LiveListeningRegistry implements ILiveListeningRegistry {
    private readonly _tabs = new Map<number, LiveListening>();

    of(tabId: number): LiveListening {
        return this._tabs.get(tabId) ?? NoLiveListening;
    }

    set(tabId: number, listening: LiveListening): void {
        this._tabs.set(tabId, listening);
    }

    forget(tabId: number): void {
        this._tabs.delete(tabId);
    }
}
