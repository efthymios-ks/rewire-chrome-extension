import { describe, expect, test } from "vitest";
import { LiveStore } from "../../../../src/Background/Features/Live/LiveStore";
import { WebSocketFrameReceivedHandler } from "../../../../src/Background/Features/Live/WebSocketFrameReceivedHandler";
import { LiveMessageDirection } from "../../../../src/Contracts/Live/LiveMessageDirection";

describe("WebSocketFrameReceivedHandler", () => {
    test("handle_WhenABinaryFrameArrives_ShouldCountItsDecodedBytes", async () => {
        // Arrange
        const store = new LiveStore();
        const handler = new WebSocketFrameReceivedHandler(store, () => new Date("2026-11-12T10:00:02.000Z"));

        // Act
        await handler.handle(7, {
            requestId: "ws-1",
            timestamp: 100,
            response: {
                opcode: 2,
                mask: false,
                payloadData: "AAEC",
            },
        });

        // Assert
        expect(store.snapshot(7).messages[0]).toMatchObject({
            direction: LiveMessageDirection.Received,
            data: "AAEC",
            size: 3,
            opcode: 2,
        });
    });
});
