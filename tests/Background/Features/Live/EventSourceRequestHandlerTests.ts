import { describe, expect, test } from "vitest";
import { EventSourceRequestHandler } from "../../../../src/Background/Features/Live/EventSourceRequestHandler";
import { LiveStore } from "../../../../src/Background/Features/Live/LiveStore";
import { LiveChannelKind } from "../../../../src/Contracts/Live/LiveChannelKind";
import { aRequestWillBeSentEvent } from "../../BackgroundTestData";

describe("EventSourceRequestHandler", () => {
    test("handle_WhenThePageOpensAnEventSource_ShouldAddAStream", async () => {
        // Arrange
        const store = new LiveStore();
        const handler = new EventSourceRequestHandler(store, () => new Date("2026-11-12T10:00:00.000Z"));

        // Act
        await handler.handle(7, aRequestWillBeSentEvent({
            requestId: "sse-1",
            type: "EventSource",
        }));

        // Assert
        expect(store.channelOf(7, "sse-1")?.kind).toBe(LiveChannelKind.EventStream);
    });

    test("handle_WhenTheRequestIsAFetch_ShouldIgnoreIt", async () => {
        // Arrange
        const store = new LiveStore();
        const handler = new EventSourceRequestHandler(store, () => new Date());

        // Act
        await handler.handle(7, aRequestWillBeSentEvent());

        // Assert
        expect(store.snapshot(7).channels).toEqual([]);
    });
});
