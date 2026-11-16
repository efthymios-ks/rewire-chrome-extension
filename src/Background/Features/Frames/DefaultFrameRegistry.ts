import type { EntryFrame } from '../../../Contracts/Timeline/EntryFrame';
import type { FrameOfOptions, FrameRegistry } from './FrameRegistry';

export class DefaultFrameRegistry implements FrameRegistry {
    private readonly _topFrames = new Map<number, string>();

    setTop(tabId: number, frameId: string): void {
        this._topFrames.set(tabId, frameId);
    }

    frameOf({ tabId, frameId, documentUrl }: FrameOfOptions): EntryFrame | null {
        if (frameId == null || frameId === '') {
            return null;
        }

        const topFrameId = this._topFrames.get(tabId);

        return {
            id: frameId,
            url: documentUrl,
            isTop: topFrameId == null || topFrameId === frameId,
        };
    }

    forget(tabId: number): void {
        this._topFrames.delete(tabId);
    }
}
