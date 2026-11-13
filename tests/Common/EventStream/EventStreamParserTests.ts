import { describe, expect, test } from "vitest";
import { EventStreamParser } from "../../../src/Common/EventStream/EventStreamParser";

describe("EventStreamParser", () => {
    test("push_WhenAnEventHasEveryField_ShouldReadThemAll", () => {
        // Arrange
        const parser = new EventStreamParser();

        // Act
        const events = parser.push("event: price\nid: 42\nretry: 3000\ndata: {\"sku\":\"CAP\"}\n\n");

        // Assert
        expect(events).toEqual([
            {
                event: "price",
                id: "42",
                retry: 3000,
                data: "{\"sku\":\"CAP\"}",
            },
        ]);
    });

    test("push_WhenAnEventIsSplitAcrossChunks_ShouldWaitForTheBlankLine", () => {
        // Arrange
        const parser = new EventStreamParser();

        // Act
        const first = parser.push("data: line one\r");
        const second = parser.push("\ndata: line two\r\n\r\n");

        // Assert
        expect(first).toEqual([]);
        expect(second.map(event => event.data)).toEqual(["line one\nline two"]);
    });

    test("push_WhenAnEventHasNoData_ShouldStillReportIt", () => {
        // Arrange
        const parser = new EventStreamParser();

        // Act
        const events = parser.push(": keep-alive\nevent: ping\n\n\n");

        // Assert
        expect(events).toEqual([
            {
                event: "ping",
                id: null,
                retry: null,
                data: null,
            },
        ]);
    });

    test("push_WhenRetryIsNotANumber_ShouldIgnoreIt", () => {
        // Arrange
        const parser = new EventStreamParser();

        // Act
        const events = parser.push("retry: soon\ndata:x\n\n");

        // Assert
        expect(events[0]?.retry).toBeNull();
        expect(events[0]?.data).toBe("x");
    });
});
