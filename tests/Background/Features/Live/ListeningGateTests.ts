import { describe, expect, test, vi } from "vitest";
import { ListeningGate } from "../../../../src/Background/Features/Live/ListeningGate";
import { LiveListeningRegistry } from "../../../../src/Background/Features/Live/LiveListeningRegistry";
import { NoLiveListening } from "../../../../src/Contracts/Live/LiveListening";

function aGate(isListening: boolean) {
    const registry = new LiveListeningRegistry();
    registry.set(7, {
        ...NoLiveListening,
        webSockets: isListening,
    });
    const inner = {
        event: "Network.webSocketCreated" as const,
        handle: vi.fn().mockResolvedValue(undefined),
    };

    return {
        inner,
        gate: new ListeningGate(
            inner,
            registry,
            "webSockets"
        ),
    };
}

const Params = {
    requestId: "ws-1",
    url: "wss://live.example.com/socket",
};

describe("ListeningGate", () => {
    test("handle_WhenTheTabListens_ShouldPassTheEventOn", async () => {
        // Arrange
        const { inner, gate } = aGate(true);

        // Act
        await gate.handle(
            7,
            Params,
            "session-a"
        );

        // Assert
        expect(gate.event).toBe("Network.webSocketCreated");
        expect(inner.handle).toHaveBeenCalledWith(
            7,
            Params,
            "session-a"
        );
    });

    test("handle_WhenTheTabIsNotListening_ShouldDropTheEvent", async () => {
        // Arrange
        const { inner, gate } = aGate(false);

        // Act
        await gate.handle(
            7,
            Params,
            null
        );

        // Assert
        expect(inner.handle).not.toHaveBeenCalled();
    });
});
