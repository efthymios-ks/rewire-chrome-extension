import type { Protocol } from "devtools-protocol";
import { describe, expect, test, vi } from "vitest";
import { TimelineStore } from "../../../../src/Background/Features/Capture/TimelineStore";
import { EventStreamParsers } from "../../../../src/Background/Features/Live/EventStreamParsers";
import { FetchStreamResponseHandler } from "../../../../src/Background/Features/Live/FetchStreamResponseHandler";
import { LiveStore } from "../../../../src/Background/Features/Live/LiveStore";
import type { IPanelConnectionHub } from "../../../../src/Background/Features/PanelConnections/PanelConnectionHub";
import { Base64Text } from "../../../../src/Common/Encoding/Base64Text";
import { Result } from "../../../../src/Common/Results/Result";
import { WorkerEventType } from "../../../../src/Contracts/Messaging/WorkerEventType";
import { aSummary } from "../../../TestData";
import { aTimelineRecord, createDebuggerClientMock, createLogger } from "../../BackgroundTestData";

function aResponseEvent(type: Protocol.Network.ResourceType, mimeType: string): Protocol.Network.ResponseReceivedEvent {
    return {
        requestId: "stream-1",
        loaderId: "loader-1",
        timestamp: 100,
        type,
        hasExtraInfo: false,
        response: {
            url: "https://api.example.com/events",
            status: 200,
            statusText: "OK",
            headers: {},
            mimeType,
            charset: "utf-8",
            connectionReused: false,
            connectionId: 1,
            encodedDataLength: 0,
            securityState: "secure",
        },
    } as Protocol.Network.ResponseReceivedEvent;
}

function setUp() {
    const debuggerMock = createDebuggerClientMock();
    debuggerMock.send.mockResolvedValue(Result.ok({
        bufferedData: Base64Text.fromUtf8("event: hello\ndata: first\n\n"),
    }));
    const liveStore = new LiveStore();
    const timelineStore = new TimelineStore();
    timelineStore.add(aTimelineRecord({
        summary: aSummary({
            id: "stream-1",
        }),
    }));
    const connectionHub = {
        publishToTab: vi.fn(),
    };
    const handler = new FetchStreamResponseHandler({
        liveStore,
        parsers: new EventStreamParsers(),
        timelineStore,
        connectionHub: connectionHub as unknown as IPanelConnectionHub,
        debuggerClient: debuggerMock.client,
        logger: createLogger(),
        now: () => new Date("2026-11-12T10:00:00.000Z"),
    });

    return {
        send: debuggerMock.send,
        liveStore,
        timelineStore,
        connectionHub,
        handler,
    };
}

describe("FetchStreamResponseHandler", () => {
    test("handle_WhenAFetchAnswersWithAnEventStream_ShouldMoveItFromTrafficToSse", async () => {
        // Arrange
        const { send, liveStore, timelineStore, connectionHub, handler } = setUp();

        // Act
        await handler.handle(7, aResponseEvent("Fetch", "text/event-stream"));

        // Assert
        expect(timelineStore.get(7, "stream-1")).toBeUndefined();
        expect(connectionHub.publishToTab).toHaveBeenCalledWith(
            7,
            {
                type: WorkerEventType.EntryRemoved,
                tabId: 7,
                entryId: "stream-1",
            }
        );
        expect(send).toHaveBeenCalledWith(
            7,
            "Network.streamResourceContent",
            {
                requestId: "stream-1",
            }
        );
        expect(liveStore.channelOf(7, "stream-1")?.isOpen).toBe(true);
        expect(liveStore.snapshot(7).messages.map(message => `${message.eventName}:${message.data}`)).toEqual(["hello:first"]);
    });

    test("handle_WhenTheResponseIsJson_ShouldLeaveTheCallInTraffic", async () => {
        // Arrange
        const { send, timelineStore, handler } = setUp();

        // Act
        await handler.handle(7, aResponseEvent("Fetch", "application/json"));

        // Assert
        expect(timelineStore.get(7, "stream-1")).toBeDefined();
        expect(send).not.toHaveBeenCalled();
    });
});
