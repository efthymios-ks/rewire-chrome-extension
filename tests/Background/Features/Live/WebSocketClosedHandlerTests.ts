import { describe, expect, test } from "vitest";
import { LiveStore } from "../../../../src/Background/Features/Live/LiveStore";
import { WebSocketClosedHandler } from "../../../../src/Background/Features/Live/WebSocketClosedHandler";
import { aChannel } from "../../../TestData";

describe("WebSocketClosedHandler", () => {
    test("handle_WhenAKnownSocketCloses_ShouldMarkItClosed", async () => {
        // Arrange
        const store = new LiveStore();
        store.upsertChannel(aChannel("ws-1"));
        const handler = new WebSocketClosedHandler(store);

        // Act
        await handler.handle(7, {
            requestId: "ws-1",
            timestamp: 100,
        });

        // Assert
        expect(store.channelOf(7, "ws-1")?.isOpen).toBe(false);
    });

    test("handle_WhenTheSocketIsUnknown_ShouldAddNothing", async () => {
        // Arrange
        const store = new LiveStore();
        const handler = new WebSocketClosedHandler(store);

        // Act
        await handler.handle(7, {
            requestId: "ws-9",
            timestamp: 100,
        });

        // Assert
        expect(store.snapshot(7).channels).toEqual([]);
    });
});
