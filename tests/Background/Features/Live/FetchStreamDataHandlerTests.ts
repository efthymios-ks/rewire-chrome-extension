import { describe, expect, test } from "vitest";
import { EventStreamParsers } from "../../../../src/Background/Features/Live/EventStreamParsers";
import { FetchStreamDataHandler } from "../../../../src/Background/Features/Live/FetchStreamDataHandler";
import { LiveStore } from "../../../../src/Background/Features/Live/LiveStore";
import { Base64Text } from "../../../../src/Common/Encoding/Base64Text";

function aDataEvent(requestId: string, text: string) {
    return {
        requestId,
        timestamp: 100,
        dataLength: text.length,
        encodedDataLength: text.length,
        data: Base64Text.fromUtf8(text),
    };
}

describe("FetchStreamDataHandler", () => {
    test("handle_WhenATrackedStreamGetsData_ShouldAddItsEvents", async () => {
        // Arrange
        const store = new LiveStore();
        const parsers = new EventStreamParsers();
        parsers.start(7, "stream-1");
        const handler = new FetchStreamDataHandler(
            store,
            parsers,
            () => new Date("2026-11-12T10:00:00.000Z")
        );

        // Act
        await handler.handle(7, aDataEvent("stream-1", "data: one\n\ndata: two\n\n"));

        // Assert
        expect(store.snapshot(7).messages.map(message => message.data)).toEqual([
            "one",
            "two",
        ]);
    });

    test("handle_WhenTheRequestIsNotAStream_ShouldAddNothing", async () => {
        // Arrange
        const store = new LiveStore();
        const handler = new FetchStreamDataHandler(
            store,
            new EventStreamParsers(),
            () => new Date()
        );

        // Act
        await handler.handle(7, aDataEvent("call-1", "data: one\n\n"));

        // Assert
        expect(store.snapshot(7).messages).toEqual([]);
    });
});
