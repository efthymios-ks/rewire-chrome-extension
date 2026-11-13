import { describe, expect, test, vi } from "vitest";
import { FrameSelect } from "../../../../src/SidePanel/Features/Frames/FrameSelect";

describe("FrameSelect", () => {
    test("update_WhenFramesAreGiven_ShouldOfferAllTopAndEachIframe", () => {
        // Arrange
        const select = new FrameSelect(vi.fn());

        // Act
        select.update(
            [
                {
                    id: "iframe-1",
                    url: "https://pay.example.com/",
                    label: "pay.example.com",
                },
            ],
            "iframe-1"
        );

        // Assert
        expect([...select.root.options].map(option => `${option.value}:${option.textContent}`)).toEqual([
            "all:All frames",
            "top:top",
            "iframe-1:pay.example.com",
        ]);
        expect(select.root.value).toBe("iframe-1");
    });

    test("change_WhenAFrameIsPicked_ShouldPassItsValue", () => {
        // Arrange
        const onChange = vi.fn();
        const select = new FrameSelect(onChange);
        select.update([], "all");

        // Act
        select.root.value = "top";
        select.root.dispatchEvent(new Event("change"));

        // Assert
        expect(onChange).toHaveBeenCalledWith("top");
    });
});
