import { describe, expect, test } from "vitest";
import { PostMessageBindingName, PostMessageProbe } from "../../../../src/Background/Features/PostMessages/PostMessageProbe";

describe("PostMessageProbe", () => {
    test("source_WhenRead_ShouldListenForMessagesThroughTheBinding", () => {
        // Arrange
        const source = PostMessageProbe.source;

        // Act
        const usesBinding = source.includes(JSON.stringify(PostMessageBindingName));

        // Assert
        expect(usesBinding).toBe(true);
        expect(source).toContain("addEventListener(\"message\"");
    });

    test("parse_WhenTheReportIsComplete_ShouldReturnIt", () => {
        // Arrange
        const payload = JSON.stringify({
            origin: "https://pay.example.com",
            href: "https://app.example.com/",
            isTop: true,
            isFromTop: false,
            isFromSelf: false,
            data: "{\"status\":\"paid\"}",
        });

        // Act
        const report = PostMessageProbe.parse(payload);

        // Assert
        expect(report?.origin).toBe("https://pay.example.com");
    });

    test.each([
        "not json",
        "null",
        "{\"origin\":1}",
    ])("parse_WhenThePayloadIs(%s)_ShouldReturnNull", payload => {
        // Arrange
        const text = payload;

        // Act
        const report = PostMessageProbe.parse(text);

        // Assert
        expect(report).toBeNull();
    });
});
