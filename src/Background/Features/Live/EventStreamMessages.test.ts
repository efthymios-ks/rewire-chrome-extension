import { describe, expect, test } from 'vitest';
import { EventStreamMessages } from './EventStreamMessages';
import { LIVE_MESSAGE_DIRECTION } from '../../../Contracts/Live/LiveMessageDirection';

describe('EventStreamMessages', () => {
    test('toDraft_WhenAnEventHasNoData_ShouldKeepNullDataAndZeroSize', () => {
        // Arrange
        const event = {
            event: 'ping',
            id: '3',
            retry: 5000,
            data: null,
        };

        // Act
        const draft = EventStreamMessages.toDraft({
            requestId: 'sse-1',
            event,
            at: new Date('2026-11-12T10:00:00.000Z'),
        });

        // Assert
        expect(draft).toEqual({
            channelId: 'sse-1',
            direction: LIVE_MESSAGE_DIRECTION.Received,
            at: '2026-11-12T10:00:00.000Z',
            data: null,
            size: 0,
            opcode: null,
            eventName: 'ping',
            eventId: '3',
            retry: 5000,
        });
    });
});
