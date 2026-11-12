import { describe, expect, test, vi } from "vitest";
import { SendClientRequestEndpoint } from "../../../../src/Background/Endpoints/SendClientRequest/SendClientRequestEndpoint";
import type { IClientRequestSender } from "../../../../src/Background/Features/ClientSending/ClientRequestSender";
import { Result } from "../../../../src/Common/Results/Result";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";

describe("SendClientRequestEndpoint", () => {
    test("handle_WhenCalled_ShouldSendTheRequestThroughTheSender", async () => {
        // Arrange
        const answer = Result.ok({
            status: 200,
            statusText: "OK",
            headers: [],
            body: "{}",
            durationInMilliseconds: 5,
        });
        const sender: IClientRequestSender = {
            send: vi.fn().mockResolvedValue(answer),
        };
        const request = {
            method: "GET",
            url: "https://api.example.com/users",
            headers: [],
            bodyBase64: null,
        };

        // Act
        const result = await new SendClientRequestEndpoint(sender).handle({
            type: PanelCommandType.SendClientRequest,
            request,
        });

        // Assert
        expect(result).toBe(answer);
        expect(sender.send).toHaveBeenCalledWith(request);
    });
});
