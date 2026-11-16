import type { LiveListening } from '../../../Contracts/Live/LiveListening';
import { NO_LIVE_LISTENING } from '../../../Contracts/Live/NoLiveListening';
import type { LiveListeningRegistry } from './LiveListeningRegistry';

export class DefaultLiveListeningRegistry implements LiveListeningRegistry {
    private readonly _tabs = new Map<number, LiveListening>();

    of(tabId: number): LiveListening {
        return this._tabs.get(tabId) ?? NO_LIVE_LISTENING;
    }

    set(tabId: number, listening: LiveListening): void {
        this._tabs.set(tabId, listening);
    }

    forget(tabId: number): void {
        this._tabs.delete(tabId);
    }
}
