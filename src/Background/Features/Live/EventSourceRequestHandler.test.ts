import { describe, expect, test } from 'vitest';
import { DefaultLiveStore } from './DefaultLiveStore';
import { EventSourceRequestHandler } from './EventSourceRequestHandler';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import { aRequestWillBeSentEvent } from '../../BackgroundTestData';

describe('EventSourceRequestHandler', () => {
    test('handleAsync_WhenThePageOpensAnEventSource_ShouldAddAStream', async () => {
        // Arrange
        const store = new DefaultLiveStore();
        const handler = new EventSourceRequestHandler(store, () => new Date('2026-11-12T10:00:00.000Z'));

        // Act
        await handler.handleAsync(
            /* tabId: */ 7,
            /* params: */ aRequestWillBeSentEvent({
                requestId: 'sse-1',
                type: 'EventSource',
            }),
        );

        // Assert
        expect(store.channelOf(7, 'sse-1')?.kind).toBe(LIVE_CHANNEL_KIND.EventStream);
    });

    test('handleAsync_WhenTheRequestIsAFetch_ShouldIgnoreIt', async () => {
        // Arrange
        const store = new DefaultLiveStore();
        const handler = new EventSourceRequestHandler(store, () => new Date());

        // Act
        await handler.handleAsync(
            /* tabId: */ 7,
            /* params: */ aRequestWillBeSentEvent(),
        );

        // Assert
        expect(store.snapshot(7).channels).toEqual([]);
    });
});
