import { describe, expect, test } from "vitest";
import { EventStreamMessages } from "../../../../src/Background/Features/Live/EventStreamMessages";
import { LiveMessageDirection } from "../../../../src/Contracts/Live/LiveMessageDirection";

describe("EventStreamMessages", () => {
    test("toDraft_WhenAnEventHasNoData_ShouldKeepNullDataAndZeroSize", () => {
        // Arrange
        const event = {
            event: "ping",
            id: "3",
            retry: 5000,
            data: null,
        };

        // Act
        const draft = EventStreamMessages.toDraft(
            "sse-1",
            event,
            new Date("2026-11-12T10:00:00.000Z")
        );

        // Assert
        expect(draft).toEqual({
            channelId: "sse-1",
            direction: LiveMessageDirection.Received,
            at: "2026-11-12T10:00:00.000Z",
            data: null,
            size: 0,
            opcode: null,
            eventName: "ping",
            eventId: "3",
            retry: 5000,
        });
    });
});
