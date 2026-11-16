import type { LiveListening } from '../../../Contracts/Live/LiveListening';

export interface LiveListeningService {
    setAsync(tabId: number, listening: LiveListening): Promise<void>;
    forget(tabId: number): void;
}
