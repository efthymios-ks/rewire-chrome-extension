import { describe, expect, test } from "vitest";
import type { EntryFrame } from "../../../../src/Contracts/Timeline/EntryFrame";
import { FrameFilters } from "../../../../src/SidePanel/Core/FrameFilters";
import { PageFrames } from "../../../../src/SidePanel/Features/Frames/PageFrames";

function aFrame(
    id: string,
    url: string,
    isTop: boolean = false
): EntryFrame {
    return {
        id,
        url,
        isTop,
    };
}

describe("PageFrames", () => {
    test("of_WhenCallsComeFromSeveralFrames_ShouldListEachIframeOnceByHost", () => {
        // Arrange
        const frames = [
            aFrame(
                "top-frame",
                "https://app.example.com/",
                true
            ),
            aFrame("iframe-1", "https://pay.example.com/start"),
            null,
            aFrame("iframe-2", "https://pay.example.com/other"),
            aFrame("iframe-1", "https://pay.example.com/confirm"),
        ];

        // Act
        const pageFrames = PageFrames.of(frames);

        // Assert
        expect(pageFrames).toEqual([
            {
                id: "iframe-1",
                url: "https://pay.example.com/confirm",
                label: "pay.example.com",
            },
            {
                id: "iframe-2",
                url: "https://pay.example.com/other",
                label: "pay.example.com (2)",
            },
        ]);
    });

    test.each([
        [
            FrameFilters.All,
            [
                true,
                true,
                true,
            ],
        ],
        [
            FrameFilters.Top,
            [
                true,
                false,
                true,
            ],
        ],
        [
            "iframe-1",
            [
                false,
                true,
                false,
            ],
        ],
    ])("accepts_WhenTheFilterIs(%s)_ShouldKeepTheMatchingCalls", (filter, expected) => {
        // Arrange
        const frames = [
            aFrame(
                "top-frame",
                "https://app.example.com/",
                true
            ),
            aFrame("iframe-1", "https://pay.example.com/"),
            null,
        ];

        // Act
        const accepted = frames.map(frame => PageFrames.accepts(frame, filter));

        // Assert
        expect(accepted).toEqual(expected);
    });
});
