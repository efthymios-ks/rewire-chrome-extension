import type { LiveChannel } from '../../../Contracts/Live/LiveChannel';
import type { LiveSnapshot } from '../../../Contracts/Live/LiveSnapshot';
import type { PostMessageRecord } from '../../../Contracts/Live/PostMessageRecord';
import type { WorkerEvent } from '../../../Contracts/Messaging/WorkerEvent';
import type { LiveMessageDraft } from './LiveMessageDraft';

export type PostMessageDraft = Omit<PostMessageRecord, 'id'>;

export type LiveStoreListener = (tabId: number, event: WorkerEvent) => void;

export interface LiveStore {
    upsertChannel(channel: LiveChannel): void;
    channelOf(tabId: number, channelId: string): LiveChannel | undefined;
    addMessage(tabId: number, draft: LiveMessageDraft): void;
    addPostMessage(draft: PostMessageDraft): void;
    removeChannels(tabId: number, channelIds: string[]): void;
    snapshot(tabId: number): LiveSnapshot;
    clear(tabId: number): void;
    subscribe(listener: LiveStoreListener): void;
}
