import type { LiveChannelKind } from "./LiveChannelKind";

export interface LiveChannel {
    id: string;
    tabId: number;
    kind: LiveChannelKind;
    url: string;
    isOpen: boolean;
    isMine: boolean;
    openedAt: string;
}
