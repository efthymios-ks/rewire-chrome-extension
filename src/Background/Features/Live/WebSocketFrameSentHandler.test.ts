import { describe, expect, test } from 'vitest';
import { DefaultLiveStore } from './DefaultLiveStore';
import { WebSocketFrameSentHandler } from './WebSocketFrameSentHandler';
import { LIVE_MESSAGE_DIRECTION } from '../../../Contracts/Live/LiveMessageDirection';

const NOW = new Date('2026-11-12T10:00:01.250Z');

describe('WebSocketFrameSentHandler', () => {
    test('handleAsync_WhenThePageSendsAText_ShouldAddASentFrame', async () => {
        // Arrange
        const store = new DefaultLiveStore();
        const handler = new WebSocketFrameSentHandler(store, () => NOW);

        // Act
        await handler.handleAsync(7, {
            requestId: 'ws-1',
            timestamp: 100,
            response: {
                opcode: 1,
                mask: true,
                payloadData: '42["join",{"room":"Γ"}]',
            },
        });

        // Assert
        expect(store.snapshot(7).messages[0]).toMatchObject({
            channelId: 'ws-1',
            direction: LIVE_MESSAGE_DIRECTION.Sent,
            at: '2026-11-12T10:00:01.250Z',
            data: '42["join",{"room":"Γ"}]',
            size: 24,
            opcode: 1,
        });
    });
});
