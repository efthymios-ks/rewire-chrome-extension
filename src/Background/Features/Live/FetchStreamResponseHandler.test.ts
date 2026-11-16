import type { Protocol } from 'devtools-protocol';
import { describe, expect, test, vi } from 'vitest';
import { DefaultTimelineStore } from '../Capture/DefaultTimelineStore';
import { DefaultEventStreamParsers } from './DefaultEventStreamParsers';
import { DefaultLiveStore } from './DefaultLiveStore';
import { FetchStreamResponseHandler } from './FetchStreamResponseHandler';
import type { PanelConnectionHub } from '../PanelConnections/PanelConnectionHub';
import { Base64Text } from '../../../Common/Encoding/Base64Text';
import { Result } from '../../../Common/Results/Result';
import { WORKER_EVENT_TYPE } from '../../../Contracts/Messaging/WorkerEventType';
import { aSummary, createLogger } from '../../../TestData';
import { aTimelineRecord, createDebuggerClientMock } from '../../BackgroundTestData';

function aResponseEvent(
    type: Protocol.Network.ResourceType,
    mimeType: string,
): Protocol.Network.ResponseReceivedEvent {
    return {
        requestId: 'stream-1',
        loaderId: 'loader-1',
        timestamp: 100,
        type,
        hasExtraInfo: false,
        response: {
            url: 'https://api.example.com/events',
            status: 200,
            statusText: 'OK',
            headers: {},
            mimeType,
            charset: 'utf-8',
            connectionReused: false,
            connectionId: 1,
            encodedDataLength: 0,
            securityState: 'secure',
        },
    } as Protocol.Network.ResponseReceivedEvent;
}

function setUp() {
    const debuggerMock = createDebuggerClientMock();
    debuggerMock.send.mockResolvedValue(Result.ok({
        bufferedData: Base64Text.fromUtf8('event: hello\ndata: first\n\n'),
    }));
    const liveStore = new DefaultLiveStore();
    const timelineStore = new DefaultTimelineStore();
    timelineStore.add(aTimelineRecord({
        summary: aSummary({
            id: 'stream-1',
        }),
    }));
    const connectionHub = {
        publishToTab: vi.fn(),
    };
    const handler = new FetchStreamResponseHandler({
        liveStore,
        parsers: new DefaultEventStreamParsers(),
        timelineStore,
        connectionHub: connectionHub as unknown as PanelConnectionHub,
        debuggerClient: debuggerMock.client,
        logger: createLogger(),
        now: () => new Date('2026-11-12T10:00:00.000Z'),
    });

    return {
        send: debuggerMock.send,
        liveStore,
        timelineStore,
        connectionHub,
        handler,
    };
}

describe('FetchStreamResponseHandler', () => {
    test('handleAsync_WhenAFetchAnswersWithAnEventStream_ShouldMoveItFromTrafficToSse', async () => {
        // Arrange
        const { send, liveStore, timelineStore, connectionHub, handler } = setUp();

        // Act
        await handler.handleAsync(
            /* tabId: */ 7,
            /* params: */ aResponseEvent('Fetch', 'text/event-stream'),
        );

        // Assert
        expect(timelineStore.get(7, 'stream-1')).toBeUndefined();
        expect(connectionHub.publishToTab).toHaveBeenCalledWith(
            /* tabId: */ 7,
            /* event: */ {
                type: WORKER_EVENT_TYPE.EntryRemoved,
                tabId: 7,
                entryId: 'stream-1',
            },
        );
        expect(send).toHaveBeenCalledWith(
            /* tabId: */ 7,
            /* command: */ 'Network.streamResourceContent',
            /* params: */ {
                requestId: 'stream-1',
            },
        );
        expect(liveStore.channelOf(7, 'stream-1')?.isOpen).toBe(true);
        const messages = liveStore
            .snapshot(7)
            .messages
            .map(message => `${message.eventName}:${message.data}`);
        expect(messages).toEqual(['hello:first']);
    });

    test('handleAsync_WhenTheResponseIsJson_ShouldLeaveTheCallInTraffic', async () => {
        // Arrange
        const { send, timelineStore, handler } = setUp();

        // Act
        await handler.handleAsync(
            /* tabId: */ 7,
            /* params: */ aResponseEvent('Fetch', 'application/json'),
        );

        // Assert
        expect(timelineStore.get(7, 'stream-1')).toBeDefined();
        expect(send).not.toHaveBeenCalled();
    });
});
