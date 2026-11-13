import { describe, expect, test } from "vitest";
import { FrameRegistry } from "../../../../src/Background/Features/Frames/FrameRegistry";

describe("FrameRegistry", () => {
    test.each([
        [
            "top-frame",
            true,
        ],
        [
            "iframe-1",
            false,
        ],
    ])("frameOf_WhenTheFrameIs(%s)_ShouldSayWhetherItIsTheTopFrame", (frameId, expected) => {
        // Arrange
        const registry = new FrameRegistry();
        registry.setTop(1, "top-frame");

        // Act
        const frame = registry.frameOf(
            1,
            frameId,
            "https://widget.example.com/embed"
        );

        // Assert
        expect(frame).toEqual({
            id: frameId,
            url: "https://widget.example.com/embed",
            isTop: expected,
        });
    });

    test("frameOf_WhenTheRequestHasNoFrame_ShouldReturnNull", () => {
        // Arrange
        const registry = new FrameRegistry();

        // Act
        const frame = registry.frameOf(
            1,
            undefined,
            "https://app.example.com/"
        );

        // Assert
        expect(frame).toBeNull();
    });

    test("frameOf_WhenTheTopFrameIsUnknown_ShouldTreatEveryFrameAsTop", () => {
        // Arrange
        const registry = new FrameRegistry();
        registry.setTop(1, "top-frame");
        registry.forget(1);

        // Act
        const frame = registry.frameOf(
            1,
            "iframe-1",
            "https://widget.example.com/embed"
        );

        // Assert
        expect(frame?.isTop).toBe(true);
    });
});
