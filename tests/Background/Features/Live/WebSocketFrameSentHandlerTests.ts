import { describe, expect, test } from "vitest";
import { LiveStore } from "../../../../src/Background/Features/Live/LiveStore";
import { WebSocketFrameSentHandler } from "../../../../src/Background/Features/Live/WebSocketFrameSentHandler";
import { LiveMessageDirection } from "../../../../src/Contracts/Live/LiveMessageDirection";

const Now = new Date("2026-11-12T10:00:01.250Z");

describe("WebSocketFrameSentHandler", () => {
    test("handle_WhenThePageSendsAText_ShouldAddASentFrame", async () => {
        // Arrange
        const store = new LiveStore();
        const handler = new WebSocketFrameSentHandler(store, () => Now);

        // Act
        await handler.handle(7, {
            requestId: "ws-1",
            timestamp: 100,
            response: {
                opcode: 1,
                mask: true,
                payloadData: "42[\"join\",{\"room\":\"Γ\"}]",
            },
        });

        // Assert
        expect(store.snapshot(7).messages[0]).toMatchObject({
            channelId: "ws-1",
            direction: LiveMessageDirection.Sent,
            at: "2026-11-12T10:00:01.250Z",
            data: "42[\"join\",{\"room\":\"Γ\"}]",
            size: 24,
            opcode: 1,
        });
    });
});
