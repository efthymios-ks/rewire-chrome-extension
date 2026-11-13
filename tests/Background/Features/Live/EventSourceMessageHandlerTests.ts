import { describe, expect, test } from "vitest";
import { EventSourceMessageHandler } from "../../../../src/Background/Features/Live/EventSourceMessageHandler";
import { LiveStore } from "../../../../src/Background/Features/Live/LiveStore";

describe("EventSourceMessageHandler", () => {
    test.each([
        [
            "message",
            "",
            null,
            null,
        ],
        [
            "price",
            "42",
            "price",
            "42",
        ],
    ])("handle_WhenTheEventIs(%s, id %s)_ShouldKeepItsNameAndId", async (eventName, eventId, expectedName, expectedId) => {
        // Arrange
        const store = new LiveStore();
        const handler = new EventSourceMessageHandler(store, () => new Date("2026-11-12T10:00:00.000Z"));

        // Act
        await handler.handle(7, {
            requestId: "sse-1",
            timestamp: 100,
            eventName,
            eventId,
            data: "{\"sku\":\"CAP\"}",
        });

        // Assert
        expect(store.snapshot(7).messages[0]).toMatchObject({
            channelId: "sse-1",
            eventName: expectedName,
            eventId: expectedId,
            data: "{\"sku\":\"CAP\"}",
        });
    });
});
