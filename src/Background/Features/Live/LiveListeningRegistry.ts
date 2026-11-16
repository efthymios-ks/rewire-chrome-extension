import type { LiveListening } from '../../../Contracts/Live/LiveListening';

export interface LiveListeningRegistry {
    of(tabId: number): LiveListening;
    set(tabId: number, listening: LiveListening): void;
    forget(tabId: number): void;
}
