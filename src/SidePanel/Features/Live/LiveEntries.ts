import type { LiveChannel } from "../../../Contracts/Live/LiveChannel";
import type { LiveMessage } from "../../../Contracts/Live/LiveMessage";
import type { LiveSnapshot } from "../../../Contracts/Live/LiveSnapshot";
import type { PostMessageRecord } from "../../../Contracts/Live/PostMessageRecord";
import type { LiveState } from "../../Core/LiveState";

export const LiveLimits = {
    MaxMessages: 2000,
    MaxPostMessages: 1000,
} as const;

function withLimit<TItem>(items: TItem[], limit: number): TItem[] {
    return items.length > limit ? items.slice(items.length - limit) : items;
}

function mineOnly(live: LiveState): LiveState {
    const mineIds = new Set(live.channels
        .filter(channel => channel.isMine)
        .map(channel => channel.id));

    return {
        channels: live.channels.filter(channel => mineIds.has(channel.id)),
        messages: live.messages.filter(message => mineIds.has(message.channelId)),
        postMessages: [],
    };
}

export const LiveEntries = {
    empty(): LiveState {
        return {
            channels: [],
            messages: [],
            postMessages: [],
        };
    },

    withoutPage(live: LiveState): LiveState {
        return mineOnly(live);
    },

    withPage(live: LiveState, snapshot: LiveSnapshot): LiveState {
        const mine = mineOnly(live);

        return {
            channels: [
                ...mine.channels,
                ...snapshot.channels,
            ],
            messages: withLimit(
                [
                    ...mine.messages,
                    ...snapshot.messages,
                ],
                LiveLimits.MaxMessages
            ),
            postMessages: withLimit(snapshot.postMessages, LiveLimits.MaxPostMessages),
        };
    },

    upsertChannel(live: LiveState, channel: LiveChannel): LiveState {
        const exists = live.channels.some(candidate => candidate.id === channel.id);

        return {
            ...live,
            channels: exists
                ? live.channels.map(candidate => candidate.id === channel.id ? channel : candidate)
                : [
                    ...live.channels,
                    channel,
                ],
        };
    },

    addMessage(live: LiveState, message: LiveMessage): LiveState {
        return {
            ...live,
            messages: withLimit(
                [
                    ...live.messages,
                    message,
                ],
                LiveLimits.MaxMessages
            ),
        };
    },

    addPostMessage(live: LiveState, record: PostMessageRecord): LiveState {
        return {
            ...live,
            postMessages: withLimit(
                [
                    ...live.postMessages,
                    record,
                ],
                LiveLimits.MaxPostMessages
            ),
        };
    },

    withoutChannels(live: LiveState, channelIds: string[]): LiveState {
        const removed = new Set(channelIds);

        return {
            ...live,
            channels: live.channels.filter(channel => !removed.has(channel.id)),
            messages: live.messages.filter(message => !removed.has(message.channelId)),
        };
    },

    messagesOf(live: LiveState, channelId: string): LiveMessage[] {
        return live.messages.filter(message => message.channelId === channelId);
    },
};
