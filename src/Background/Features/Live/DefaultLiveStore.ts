import { getOrCreate } from '../../../Common/Collections/getOrCreate';
import type { LiveChannel } from '../../../Contracts/Live/LiveChannel';
import type { LiveMessage } from '../../../Contracts/Live/LiveMessage';
import type { LiveSnapshot } from '../../../Contracts/Live/LiveSnapshot';
import type { PostMessageRecord } from '../../../Contracts/Live/PostMessageRecord';
import type { WorkerEvent } from '../../../Contracts/Messaging/WorkerEvent';
import { WORKER_EVENT_TYPE } from '../../../Contracts/Messaging/WorkerEventType';
import { BoundedMap } from '../../Core/BoundedMap';
import { LIVE_LIMITS } from './LiveLimits';
import type { LiveMessageDraft } from './LiveMessageDraft';
import type { LiveStore, LiveStoreListener, PostMessageDraft } from './LiveStore';

interface TabLive {
    channels: Map<string, LiveChannel>;
    messages: LiveMessage[];
    postMessages: PostMessageRecord[];
}

function withLimit<TItem>(items: TItem[], limit: number): TItem[] {
    return items.length > limit ? items.slice(items.length - limit) : items;
}

export class DefaultLiveStore implements LiveStore {
    private readonly _tabs = new Map<number, TabLive>();
    private readonly _listeners: LiveStoreListener[] = [];
    private _sequence = 0;

    upsertChannel(channel: LiveChannel): void {
        const tab = this.tabOf(channel.tabId);
        tab.channels.set(channel.id, channel);
        this.publish(
            /* tabId: */ channel.tabId,
            /* event: */ {
                type: WORKER_EVENT_TYPE.ChannelUpserted,
                channel,
            },
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
            /* items: */ [
                ...tab.messages,
                message,
            ],
            /* limit: */ LIVE_LIMITS.MaxMessagesPerTab,
        );
        this.publish(
            /* tabId: */ tabId,
            /* event: */ {
                type: WORKER_EVENT_TYPE.LiveMessageAdded,
                tabId,
                message,
            },
        );
    }

    addPostMessage(draft: PostMessageDraft): void {
        const tab = this.tabOf(draft.tabId);
        const record: PostMessageRecord = {
            ...draft,
            id: this.nextId(),
        };
        tab.postMessages = withLimit(
            /* items: */ [
                ...tab.postMessages,
                record,
            ],
            /* limit: */ LIVE_LIMITS.MaxPostMessagesPerTab,
        );
        this.publish(
            /* tabId: */ draft.tabId,
            /* event: */ {
                type: WORKER_EVENT_TYPE.PostMessageAdded,
                record,
            },
        );
    }

    removeChannels(tabId: number, channelIds: string[]): void {
        const tab = this._tabs.get(tabId);
        if (tab == null) {
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
        return getOrCreate({
            map: this._tabs,
            key: tabId,
            create: () => ({
                channels: new BoundedMap(LIVE_LIMITS.MaxChannelsPerTab),
                messages: [],
                postMessages: [],
            }),
        });
    }

    private nextId(): string {
        this._sequence += 1;

        return `live-${this._sequence}`;
    }

    private publish(tabId: number, event: WorkerEvent): void {
        this._listeners.forEach(listener => listener(tabId, event));
    }
}
