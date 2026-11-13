import { describe, expect, test, vi } from "vitest";
import { SetLiveListeningEndpoint } from "../../../../src/Background/Endpoints/SetLiveListening/SetLiveListeningEndpoint";
import { NoLiveListening } from "../../../../src/Contracts/Live/LiveListening";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";

describe("SetLiveListeningEndpoint", () => {
    test("handle_WhenListeningChanges_ShouldPassItToTheService", async () => {
        // Arrange
        const service = {
            set: vi.fn().mockResolvedValue(undefined),
            forget: vi.fn(),
        };
        const endpoint = new SetLiveListeningEndpoint(service);
        const listening = {
            ...NoLiveListening,
            webSockets: true,
        };

        // Act
        const result = await endpoint.handle({
            type: PanelCommandType.SetLiveListening,
            tabId: 7,
            listening,
        });

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(service.set).toHaveBeenCalledWith(7, listening);
    });
});
