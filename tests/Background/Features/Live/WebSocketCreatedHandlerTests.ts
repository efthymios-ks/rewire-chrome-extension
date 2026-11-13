import { describe, expect, test } from "vitest";
import { LiveStore } from "../../../../src/Background/Features/Live/LiveStore";
import { WebSocketCreatedHandler } from "../../../../src/Background/Features/Live/WebSocketCreatedHandler";
import { LiveChannelKind } from "../../../../src/Contracts/Live/LiveChannelKind";

const Now = new Date("2026-11-12T10:00:00.000Z");

describe("WebSocketCreatedHandler", () => {
    test("handle_WhenThePageOpensASocket_ShouldAddAnOpenPageChannel", async () => {
        // Arrange
        const store = new LiveStore();
        const handler = new WebSocketCreatedHandler(store, () => Now);

        // Act
        await handler.handle(7, {
            requestId: "ws-1",
            url: "wss://live.example.com/socket",
        });

        // Assert
        expect(store.channelOf(7, "ws-1")).toEqual({
            id: "ws-1",
            tabId: 7,
            kind: LiveChannelKind.WebSocket,
            url: "wss://live.example.com/socket",
            isOpen: true,
            isMine: false,
            openedAt: "2026-11-12T10:00:00.000Z",
        });
    });
});
