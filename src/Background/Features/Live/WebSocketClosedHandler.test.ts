import { describe, expect, test } from 'vitest';
import { DefaultLiveStore } from './DefaultLiveStore';
import { WebSocketClosedHandler } from './WebSocketClosedHandler';
import { aChannel } from '../../../TestData';

describe('WebSocketClosedHandler', () => {
    test('handleAsync_WhenAKnownSocketCloses_ShouldMarkItClosed', async () => {
        // Arrange
        const store = new DefaultLiveStore();
        store.upsertChannel(aChannel({ id: 'ws-1' }));
        const handler = new WebSocketClosedHandler(store);

        // Act
        await handler.handleAsync(7, {
            requestId: 'ws-1',
            timestamp: 100,
        });

        // Assert
        expect(store.channelOf(7, 'ws-1')?.isOpen).toBe(false);
    });

    test('handleAsync_WhenTheSocketIsUnknown_ShouldAddNothing', async () => {
        // Arrange
        const store = new DefaultLiveStore();
        const handler = new WebSocketClosedHandler(store);

        // Act
        await handler.handleAsync(7, {
            requestId: 'ws-9',
            timestamp: 100,
        });

        // Assert
        expect(store.snapshot(7).channels).toEqual([]);
    });
});
