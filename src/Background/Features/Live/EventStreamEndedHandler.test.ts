import { describe, expect, test } from 'vitest';
import { DefaultEventStreamParsers } from './DefaultEventStreamParsers';
import { DefaultLiveStore } from './DefaultLiveStore';
import { EventStreamEndedHandler } from './EventStreamEndedHandler';
import { Base64Text } from '../../../Common/Encoding/Base64Text';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import { aChannel } from '../../../TestData';

describe('EventStreamEndedHandler', () => {
    test('handleAsync_WhenAStreamFinishes_ShouldCloseItAndStopParsing', async () => {
        // Arrange
        const store = new DefaultLiveStore();
        store.upsertChannel(aChannel({ id: 'sse-1', kind: LIVE_CHANNEL_KIND.EventStream }));
        const parsers = new DefaultEventStreamParsers();
        parsers.start(7, 'sse-1');
        const handler = new EventStreamEndedHandler({
            event: 'Network.loadingFinished',
            liveStore: store,
            parsers,
        });

        // Act
        await handler.handleAsync(7, {
            requestId: 'sse-1',
            timestamp: 100,
            encodedDataLength: 0,
        });

        // Assert
        expect(store.channelOf(7, 'sse-1')?.isOpen).toBe(false);
        expect(parsers.feed({
            tabId: 7,
            requestId: 'sse-1',
            base64: Base64Text.fromUtf8('data: late\n\n'),
        })).toBeNull();
    });
});
