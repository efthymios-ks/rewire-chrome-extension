import { describe, expect, test } from 'vitest';
import { DefaultEventStreamParsers } from './DefaultEventStreamParsers';
import { DefaultLiveStore } from './DefaultLiveStore';
import { FetchStreamDataHandler } from './FetchStreamDataHandler';
import { Base64Text } from '../../../Common/Encoding/Base64Text';

function aDataEvent(requestId: string, text: string) {
    return {
        requestId,
        timestamp: 100,
        dataLength: text.length,
        encodedDataLength: text.length,
        data: Base64Text.fromUtf8(text),
    };
}

describe('FetchStreamDataHandler', () => {
    test('handleAsync_WhenATrackedStreamGetsData_ShouldAddItsEvents', async () => {
        // Arrange
        const store = new DefaultLiveStore();
        const parsers = new DefaultEventStreamParsers();
        parsers.start(7, 'stream-1');
        const handler = new FetchStreamDataHandler({
            liveStore: store,
            parsers,
            now: () => new Date('2026-11-12T10:00:00.000Z'),
        });

        // Act
        await handler.handleAsync(
            /* tabId: */ 7,
            /* params: */ aDataEvent('stream-1', 'data: one\n\ndata: two\n\n'),
        );

        // Assert
        expect(store.snapshot(7).messages.map(message => message.data)).toEqual([
            'one',
            'two',
        ]);
    });

    test('handleAsync_WhenTheRequestIsNotAStream_ShouldAddNothing', async () => {
        // Arrange
        const store = new DefaultLiveStore();
        const handler = new FetchStreamDataHandler({
            liveStore: store,
            parsers: new DefaultEventStreamParsers(),
            now: () => new Date(),
        });

        // Act
        await handler.handleAsync(
            /* tabId: */ 7,
            /* params: */ aDataEvent('call-1', 'data: one\n\n'),
        );

        // Assert
        expect(store.snapshot(7).messages).toEqual([]);
    });
});
