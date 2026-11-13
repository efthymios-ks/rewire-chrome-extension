import { describe, expect, test } from "vitest";
import { FrameLabel } from "../../../src/Common/Urls/FrameLabel";

describe("FrameLabel", () => {
    test.each([
        [
            "https://pay.example.com/checkout",
            false,
            "pay.example.com",
        ],
        [
            "https://app.example.com/",
            true,
            "top",
        ],
        [
            "about:blank",
            false,
            "about:blank",
        ],
    ])("of_WhenTheFrameIs(%s, top %s)_ShouldLabelIt(%s)", (url, isTop, expected) => {
        // Arrange
        const frameUrl = url;

        // Act
        const label = FrameLabel.of(frameUrl, isTop);

        // Assert
        expect(label).toBe(expected);
    });
});
