import { describe, expect, test } from "vitest";
import { EventStreamEndedHandler } from "../../../../src/Background/Features/Live/EventStreamEndedHandler";
import { EventStreamParsers } from "../../../../src/Background/Features/Live/EventStreamParsers";
import { LiveStore } from "../../../../src/Background/Features/Live/LiveStore";
import { Base64Text } from "../../../../src/Common/Encoding/Base64Text";
import { LiveChannelKind } from "../../../../src/Contracts/Live/LiveChannelKind";
import { aChannel } from "../../../TestData";

describe("EventStreamEndedHandler", () => {
    test("handle_WhenAStreamFinishes_ShouldCloseItAndStopParsing", async () => {
        // Arrange
        const store = new LiveStore();
        store.upsertChannel(aChannel("sse-1", LiveChannelKind.EventStream));
        const parsers = new EventStreamParsers();
        parsers.start(7, "sse-1");
        const handler = new EventStreamEndedHandler(
            "Network.loadingFinished",
            store,
            parsers
        );

        // Act
        await handler.handle(7, {
            requestId: "sse-1",
            timestamp: 100,
            encodedDataLength: 0,
        });

        // Assert
        expect(store.channelOf(7, "sse-1")?.isOpen).toBe(false);
        expect(parsers.feed(
            7,
            "sse-1",
            Base64Text.fromUtf8("data: late\n\n")
        )).toBeNull();
    });
});
