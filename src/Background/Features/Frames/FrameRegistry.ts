import type { EntryFrame } from "../../../Contracts/Timeline/EntryFrame";

export interface IFrameRegistry {
    setTop(tabId: number, frameId: string): void;
    frameOf(
        tabId: number,
        frameId: string | undefined,
        documentUrl: string
    ): EntryFrame | null;
    forget(tabId: number): void;
}

export class FrameRegistry implements IFrameRegistry {
    private readonly _topFrames = new Map<number, string>();

    setTop(tabId: number, frameId: string): void {
        this._topFrames.set(tabId, frameId);
    }

    frameOf(
        tabId: number,
        frameId: string | undefined,
        documentUrl: string
    ): EntryFrame | null {
        if (frameId === undefined || frameId === "") {
            return null;
        }

        const topFrameId = this._topFrames.get(tabId);

        return {
            id: frameId,
            url: documentUrl,
            isTop: topFrameId === undefined || topFrameId === frameId,
        };
    }

    forget(tabId: number): void {
        this._topFrames.delete(tabId);
    }
}
