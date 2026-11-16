import { describe, expect, test } from 'vitest';
import { WebSocketFrames } from './WebSocketFrames';
import { LIVE_MESSAGE_DIRECTION } from '../../../Contracts/Live/LiveMessageDirection';

describe('WebSocketFrames', () => {
    test('toDraft_WhenAFrameIsText_ShouldCountItsUtf8Bytes', () => {
        // Arrange
        const frame = {
            opcode: 1,
            mask: false,
            payloadData: 'Γειά',
        };

        // Act
        const draft = WebSocketFrames.toDraft({
            requestId: 'ws-1',
            direction: LIVE_MESSAGE_DIRECTION.Received,
            frame,
            at: new Date('2026-11-12T10:00:00.000Z'),
        });

        // Assert
        expect(draft).toEqual({
            channelId: 'ws-1',
            direction: LIVE_MESSAGE_DIRECTION.Received,
            at: '2026-11-12T10:00:00.000Z',
            data: 'Γειά',
            size: 8,
            opcode: 1,
            eventName: null,
            eventId: null,
            retry: null,
        });
    });
});
