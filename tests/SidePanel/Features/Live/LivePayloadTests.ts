import { describe, expect, test } from "vitest";
import { LivePayload } from "../../../../src/SidePanel/Features/Live/LivePayload";

describe("LivePayload", () => {
    test.each([
        [
            "{\"type\":\"hello\"}",
            {
                type: "hello",
            },
        ],
        [
            "42[\"chat\",{\"text\":\"hi\"}]",
            [
                "chat",
                {
                    text: "hi",
                },
            ],
        ],
        [
            "0{\"sid\":\"abc\"}",
            {
                sid: "abc",
            },
        ],
    ])("jsonOf_WhenTheDataIs(%s)_ShouldReturnItsJson", (data, expected) => {
        // Arrange
        const text = data;

        // Act
        const json = LivePayload.jsonOf(text);

        // Assert
        expect(json).toEqual(expected);
    });

    test.each([
        "hello",
        "42",
        "3",
        "42[broken",
    ])("jsonOf_WhenTheDataIs(%s)_ShouldReturnUndefined", data => {
        // Arrange
        const text = data;

        // Act
        const json = LivePayload.jsonOf(text);

        // Assert
        expect(json).toBeUndefined();
    });
});
