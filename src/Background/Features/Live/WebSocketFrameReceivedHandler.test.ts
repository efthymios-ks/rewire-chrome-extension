import { describe, expect, test } from 'vitest';
import { DefaultLiveStore } from './DefaultLiveStore';
import { WebSocketFrameReceivedHandler } from './WebSocketFrameReceivedHandler';
import { LIVE_MESSAGE_DIRECTION } from '../../../Contracts/Live/LiveMessageDirection';

describe('WebSocketFrameReceivedHandler', () => {
    test('handleAsync_WhenABinaryFrameArrives_ShouldCountItsDecodedBytes', async () => {
        // Arrange
        const store = new DefaultLiveStore();
        const handler = new WebSocketFrameReceivedHandler(store, () => new Date('2026-11-12T10:00:02.000Z'));

        // Act
        await handler.handleAsync(7, {
            requestId: 'ws-1',
            timestamp: 100,
            response: {
                opcode: 2,
                mask: false,
                payloadData: 'AAEC',
            },
        });

        // Assert
        expect(store.snapshot(7).messages[0]).toMatchObject({
            direction: LIVE_MESSAGE_DIRECTION.Received,
            data: 'AAEC',
            size: 3,
            opcode: 2,
        });
    });
});
