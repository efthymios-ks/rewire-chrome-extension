import { describe, expect, test } from "vitest";
import { WebSocketFrames } from "../../../../src/Background/Features/Live/WebSocketFrames";
import { LiveMessageDirection } from "../../../../src/Contracts/Live/LiveMessageDirection";

describe("WebSocketFrames", () => {
    test("toDraft_WhenAFrameIsText_ShouldCountItsUtf8Bytes", () => {
        // Arrange
        const frame = {
            opcode: 1,
            mask: false,
            payloadData: "Γειά",
        };

        // Act
        const draft = WebSocketFrames.toDraft(
            "ws-1",
            LiveMessageDirection.Received,
            frame,
            new Date("2026-11-12T10:00:00.000Z")
        );

        // Assert
        expect(draft).toEqual({
            channelId: "ws-1",
            direction: LiveMessageDirection.Received,
            at: "2026-11-12T10:00:00.000Z",
            data: "Γειά",
            size: 8,
            opcode: 1,
            eventName: null,
            eventId: null,
            retry: null,
        });
    });
});
