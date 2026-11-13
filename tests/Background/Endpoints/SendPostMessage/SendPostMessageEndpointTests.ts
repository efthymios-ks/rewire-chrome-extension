import { describe, expect, test, vi } from "vitest";
import { SendPostMessageEndpoint } from "../../../../src/Background/Endpoints/SendPostMessage/SendPostMessageEndpoint";
import { Result } from "../../../../src/Common/Results/Result";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";

describe("SendPostMessageEndpoint", () => {
    test("handle_WhenAMessageIsSent_ShouldPassItToTheSender", async () => {
        // Arrange
        const sender = {
            send: vi.fn().mockResolvedValue(Result.done()),
            claim: vi.fn(),
        };
        const endpoint = new SendPostMessageEndpoint(sender);

        // Act
        const result = await endpoint.handle({
            type: PanelCommandType.SendPostMessage,
            tabId: 7,
            target: "pay.example.com",
            data: "hello",
        });

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(sender.send).toHaveBeenCalledWith(
            7,
            "pay.example.com",
            "hello"
        );
    });
});
