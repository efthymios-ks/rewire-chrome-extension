import type { EntryFrame } from '../../../Contracts/Timeline/EntryFrame';

export interface FrameOfOptions {
    tabId: number;
    frameId: string | undefined;
    documentUrl: string;
}

export interface FrameRegistry {
    setTop(tabId: number, frameId: string): void;
    frameOf(options: FrameOfOptions): EntryFrame | null;
    forget(tabId: number): void;
}
