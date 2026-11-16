import { describe, expect, test, vi } from 'vitest';
import { DefaultLiveStore } from './DefaultLiveStore';
import { LIVE_LIMITS } from './LiveLimits';
import { WORKER_EVENT_TYPE } from '../../../Contracts/Messaging/WorkerEventType';
import { aChannel, aLiveMessage, aPostMessage } from '../../../TestData';

function draftOf(index: number) {
    const { id: _id, ...draft } = aLiveMessage({
        data: `frame ${index}`,
    });

    return draft;
}

describe('DefaultLiveStore', () => {
    test('upsertChannel_WhenAChannelOpens_ShouldStoreItAndTellListeners', () => {
        // Arrange
        const store = new DefaultLiveStore();
        const listener = vi.fn();
        store.subscribe(listener);

        // Act
        store.upsertChannel(aChannel({ id: 'ws-1' }));

        // Assert
        expect(store.channelOf(7, 'ws-1')?.url).toBe('wss://live.example.com/socket');
        expect(listener).toHaveBeenCalledWith(
            /* tabId: */ 7,
            /* event: */ {
                type: WORKER_EVENT_TYPE.ChannelUpserted,
                channel: aChannel({ id: 'ws-1' }),
            },
        );
    });

    test('addMessage_WhenTheLimitIsPassed_ShouldDropTheOldestAndNumberEachMessage', () => {
        // Arrange
        const store = new DefaultLiveStore();
        for (let index = 0; index < LIVE_LIMITS.MaxMessagesPerTab; index++) {
            store.addMessage(
                /* tabId: */ 7,
                /* draft: */ draftOf(index),
            );
        }

        // Act
        store.addMessage(
            /* tabId: */ 7,
            /* draft: */ draftOf(LIVE_LIMITS.MaxMessagesPerTab),
        );

        // Assert
        const { messages } = store.snapshot(7);
        expect(messages).toHaveLength(LIVE_LIMITS.MaxMessagesPerTab);
        expect(messages[0]?.data).toBe('frame 1');
        expect(new Set(messages.map(message => message.id)).size).toBe(LIVE_LIMITS.MaxMessagesPerTab);
    });

    test('snapshot_WhenTheTabIsCleared_ShouldBeEmpty', () => {
        // Arrange
        const store = new DefaultLiveStore();
        const { id: _id, ...record } = aPostMessage();
        store.upsertChannel(aChannel({ id: 'ws-1' }));
        store.addPostMessage(record);

        // Act
        store.clear(7);

        // Assert
        expect(store.snapshot(7)).toEqual({
            channels: [],
            messages: [],
            postMessages: [],
        });
    });
});
