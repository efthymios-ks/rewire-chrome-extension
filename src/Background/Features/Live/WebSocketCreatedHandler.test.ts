import { describe, expect, test } from 'vitest';
import { DefaultLiveStore } from './DefaultLiveStore';
import { WebSocketCreatedHandler } from './WebSocketCreatedHandler';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';

const NOW = new Date('2026-11-12T10:00:00.000Z');

describe('WebSocketCreatedHandler', () => {
    test('handleAsync_WhenThePageOpensASocket_ShouldAddAnOpenPageChannel', async () => {
        // Arrange
        const store = new DefaultLiveStore();
        const handler = new WebSocketCreatedHandler(store, () => NOW);

        // Act
        await handler.handleAsync(7, {
            requestId: 'ws-1',
            url: 'wss://live.example.com/socket',
        });

        // Assert
        expect(store.channelOf(7, 'ws-1')).toEqual({
            id: 'ws-1',
            tabId: 7,
            kind: LIVE_CHANNEL_KIND.WebSocket,
            url: 'wss://live.example.com/socket',
            isOpen: true,
            isMine: false,
            openedAt: '2026-11-12T10:00:00.000Z',
        });
    });
});
