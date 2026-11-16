import { describe, expect, test } from 'vitest';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import type { LiveState } from '../../Core/LiveState';
import { LiveEntries } from './LiveEntries';
import { LIVE_LIMITS } from './LiveLimits';
import { aChannel, aLiveMessage, aPostMessage } from '../../../TestData';

function emptyLive(): LiveState {
    return {
        channels: [],
        messages: [],
        postMessages: [],
    };
}

const MINE = aChannel({
    id: 'mine-ws-1',
    kind: LIVE_CHANNEL_KIND.WebSocket,
    isOpen: true,
    overrides: {
        isMine: true,
    },
});

describe('LiveEntries', () => {
    test('withPage_WhenASnapshotArrives_ShouldKeepMyChannelsAndAddThePageOnes', () => {
        // Arrange
        const live = {
            channels: [
                MINE,
                aChannel({ id: 'old-page-ws' }),
            ],
            messages: [
                aLiveMessage({
                    id: 'mine-frame',
                    channelId: 'mine-ws-1',
                }),
            ],
            postMessages: [],
        };

        // Act
        const merged = LiveEntries.withPage(
            /* live: */ live,
            /* snapshot: */ {
                channels: [aChannel({ id: 'page-ws' })],
                messages: [
                    aLiveMessage({
                        id: 'page-frame',
                        channelId: 'page-ws',
                    }),
                ],
                postMessages: [aPostMessage()],
            },
        );

        // Assert
        expect(merged.channels.map(channel => channel.id)).toEqual([
            'mine-ws-1',
            'page-ws',
        ]);
        expect(merged.messages.map(message => message.id)).toEqual([
            'mine-frame',
            'page-frame',
        ]);
        expect(merged.postMessages).toHaveLength(1);
    });

    test('upsertChannel_WhenTheChannelExists_ShouldReplaceItInPlace', () => {
        // Arrange
        const live = {
            ...emptyLive(),
            channels: [
                aChannel({ id: 'ws-1' }),
                aChannel({ id: 'ws-2' }),
            ],
        };

        // Act
        const updated = LiveEntries.upsertChannel(
            /* live: */ live,
            /* channel: */ aChannel({
                id: 'ws-1',
                kind: LIVE_CHANNEL_KIND.WebSocket,
                isOpen: false,
            }),
        );

        // Assert
        expect(updated.channels.map(channel => `${channel.id}:${channel.isOpen}`)).toEqual([
            'ws-1:false',
            'ws-2:true',
        ]);
    });

    test('addMessage_WhenTheLimitIsPassed_ShouldDropTheOldest', () => {
        // Arrange
        const live = {
            ...emptyLive(),
            messages: Array.from({
                length: LIVE_LIMITS.MaxMessages,
            }, (_, index) => aLiveMessage({
                id: `frame-${index}`,
            })),
        };

        // Act
        const updated = LiveEntries.addMessage(
            /* live: */ live,
            /* message: */ aLiveMessage({
                id: 'newest',
            }),
        );

        // Assert
        expect(updated.messages).toHaveLength(LIVE_LIMITS.MaxMessages);
        expect(updated.messages[0]?.id).toBe('frame-1');
        expect(updated.messages.at(-1)?.id).toBe('newest');
    });

    test('withoutChannels_WhenChannelsAreRemoved_ShouldDropThemAndTheirMessages', () => {
        // Arrange
        const live = {
            ...emptyLive(),
            channels: [
                aChannel({ id: 'ws-1' }),
                aChannel({ id: 'ws-2' }),
            ],
            messages: [
                aLiveMessage({
                    id: 'frame-1',
                    channelId: 'ws-1',
                }),
                aLiveMessage({
                    id: 'frame-2',
                    channelId: 'ws-2',
                }),
            ],
        };

        // Act
        const updated = LiveEntries.withoutChannels(live, ['ws-1']);

        // Assert
        expect(updated.channels.map(channel => channel.id)).toEqual(['ws-2']);
        expect(updated.messages.map(message => message.id)).toEqual(['frame-2']);
    });
});
