import type { LiveChannel } from "../../../Contracts/Live/LiveChannel";
import type { LiveMessage } from "../../../Contracts/Live/LiveMessage";
import type { LiveSnapshot } from "../../../Contracts/Live/LiveSnapshot";
import type { PostMessageRecord } from "../../../Contracts/Live/PostMessageRecord";
import type { WorkerEvent } from "../../../Contracts/Messaging/WorkerEvent";
import { WorkerEventType } from "../../../Contracts/Messaging/WorkerEventType";

export const LiveLimits = {
    MaxChannelsPerTab: 200,
    MaxMessagesPerTab: 2000,
    MaxPostMessagesPerTab: 1000,
} as const;

export type LiveMessageDraft = Omit<LiveMessage, "id">;

export type PostMessageDraft = Omit<PostMessageRecord, "id">;

export type LiveStoreListener = (tabId: number, event: WorkerEvent) => void;

export interface ILiveStore {
    upsertChannel(channel: LiveChannel): void;
    channelOf(tabId: number, channelId: string): LiveChannel | undefined;
    addMessage(tabId: number, draft: LiveMessageDraft): void;
    addPostMessage(draft: PostMessageDraft): void;
    removeChannels(tabId: number, channelIds: string[]): void;
    snapshot(tabId: number): LiveSnapshot;
    clear(tabId: number): void;
    subscribe(listener: LiveStoreListener): void;
}

interface TabLive {
    channels: Map<string, LiveChannel>;
    messages: LiveMessage[];
    postMessages: PostMessageRecord[];
}

function withLimit<TItem>(items: TItem[], limit: number): TItem[] {
    return items.length > limit ? items.slice(items.length - limit) : items;
}

export class LiveStore implements ILiveStore {
    private readonly _tabs = new Map<number, TabLive>();
    private readonly _listeners: LiveStoreListener[] = [];
    private _sequence = 0;

    upsertChannel(channel: LiveChannel): void {
        const tab = this.tabOf(channel.tabId);
        tab.channels.set(channel.id, channel);
        if (tab.channels.size > LiveLimits.MaxChannelsPerTab) {
            const oldest = tab.channels.keys().next().value;
            if (oldest !== undefined) {
                tab.channels.delete(oldest);
            }
        }

        this.publish(
            channel.tabId,
            {
                type: WorkerEventType.ChannelUpserted,
                channel,
            }
        );
    }

    channelOf(tabId: number, channelId: string): LiveChannel | undefined {
        return this._tabs.get(tabId)?.channels.get(channelId);
    }

    addMessage(tabId: number, draft: LiveMessageDraft): void {
        const tab = this.tabOf(tabId);
        const message: LiveMessage = {
            ...draft,
            id: this.nextId(),
        };
        tab.messages = withLimit(
            [
                ...tab.messages,
                message,
            ],
            LiveLimits.MaxMessagesPerTab
        );
        this.publish(
            tabId,
            {
                type: WorkerEventType.LiveMessageAdded,
                tabId,
                message,
            }
        );
    }

    addPostMessage(draft: PostMessageDraft): void {
        const tab = this.tabOf(draft.tabId);
        const record: PostMessageRecord = {
            ...draft,
            id: this.nextId(),
        };
        tab.postMessages = withLimit(
            [
                ...tab.postMessages,
                record,
            ],
            LiveLimits.MaxPostMessagesPerTab
        );
        this.publish(
            draft.tabId,
            {
                type: WorkerEventType.PostMessageAdded,
                record,
            }
        );
    }

    removeChannels(tabId: number, channelIds: string[]): void {
        const tab = this._tabs.get(tabId);
        if (tab === undefined) {
            return;
        }

        const removed = new Set(channelIds);
        removed.forEach(channelId => tab.channels.delete(channelId));
        tab.messages = tab.messages.filter(message => !removed.has(message.channelId));
    }

    snapshot(tabId: number): LiveSnapshot {
        const tab = this._tabs.get(tabId);

        return {
            channels: [...tab?.channels.values() ?? []],
            messages: [...tab?.messages ?? []],
            postMessages: [...tab?.postMessages ?? []],
        };
    }

    clear(tabId: number): void {
        this._tabs.delete(tabId);
    }

    subscribe(listener: LiveStoreListener): void {
        this._listeners.push(listener);
    }

    private tabOf(tabId: number): TabLive {
        const existing = this._tabs.get(tabId);
        if (existing !== undefined) {
            return existing;
        }

        const created: TabLive = {
            channels: new Map(),
            messages: [],
            postMessages: [],
        };
        this._tabs.set(tabId, created);

        return created;
    }

    private nextId(): string {
        this._sequence += 1;

        return `live-${this._sequence}`;
    }

    private publish(tabId: number, event: WorkerEvent): void {
        this._listeners.forEach(listener => listener(tabId, event));
    }
}
