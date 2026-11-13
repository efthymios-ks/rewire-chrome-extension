import { describe, expect, test } from "vitest";
import { EventStreamParsers } from "../../../../src/Background/Features/Live/EventStreamParsers";
import { Base64Text } from "../../../../src/Common/Encoding/Base64Text";

describe("EventStreamParsers", () => {
    test("feed_WhenACharacterIsSplitAcrossChunks_ShouldDecodeItWhole", () => {
        // Arrange
        const parsers = new EventStreamParsers();
        parsers.start(7, "sse-1");
        const bytes = new TextEncoder().encode("data: Γ\n\n");

        // Act
        const first = parsers.feed(
            7,
            "sse-1",
            Base64Text.fromBytes(bytes.slice(0, 7))
        );
        const second = parsers.feed(
            7,
            "sse-1",
            Base64Text.fromBytes(bytes.slice(7))
        );

        // Assert
        expect(first).toEqual([]);
        expect(second?.map(event => event.data)).toEqual(["Γ"]);
    });

    test("feed_WhenTheStreamWasNeverStarted_ShouldReturnNull", () => {
        // Arrange
        const parsers = new EventStreamParsers();

        // Act
        const events = parsers.feed(
            7,
            "sse-9",
            Base64Text.fromUtf8("data: x\n\n")
        );

        // Assert
        expect(events).toBeNull();
    });
});
