import { describe, expect, test } from "vitest";
import { HorizontalWheel } from "../../../../src/SidePanel/Core/Dom/HorizontalWheel";

const MaxFrames = 100;

function aStrip(scrollWidth: number, clientWidth: number) {
    const strip = document.createElement("nav");
    Object.defineProperty(strip, "scrollWidth", {
        value: scrollWidth,
    });
    Object.defineProperty(strip, "clientWidth", {
        value: clientWidth,
    });
    const frames: Array<() => void> = [];
    HorizontalWheel.attach(strip, step => frames.push(step));

    return {
        strip,
        frames,
        runFrame: () => frames.shift()?.(),
        settle: () => {
            for (let count = 0; count < MaxFrames && frames.length > 0; count++) {
                frames.shift()?.();
            }
        },
    };
}

function wheel(deltaX: number, deltaY: number): WheelEvent {
    return new WheelEvent("wheel", {
        deltaX,
        deltaY,
        cancelable: true,
    });
}

describe("HorizontalWheel", () => {
    test("attach_WhenTheWheelTurns_ShouldGlideSidewaysToTheTarget", () => {
        // Arrange
        const { strip, runFrame, settle } = aStrip(900, 300);
        const event = wheel(0, 120);

        // Act
        strip.dispatchEvent(event);
        runFrame();
        const afterOneFrame = strip.scrollLeft;
        settle();

        // Assert
        expect(event.defaultPrevented).toBe(true);
        expect(afterOneFrame).toBeGreaterThan(0);
        expect(afterOneFrame).toBeLessThan(120);
        expect(strip.scrollLeft).toBe(120);
    });

    test("attach_WhenNotchesComeQuickly_ShouldAddThemUpAndStopAtTheEnd", () => {
        // Arrange
        const { strip, frames, settle } = aStrip(500, 300);

        // Act
        strip.dispatchEvent(wheel(0, 120));
        strip.dispatchEvent(wheel(0, 120));
        const pendingFrames = frames.length;
        settle();

        // Assert
        expect(pendingFrames).toBe(1);
        expect(strip.scrollLeft).toBe(200);
    });

    test("attach_WhenTheStripFits_ShouldLeaveTheWheelAlone", () => {
        // Arrange
        const { strip, frames } = aStrip(300, 300);
        const event = wheel(0, 120);

        // Act
        strip.dispatchEvent(event);

        // Assert
        expect(event.defaultPrevented).toBe(false);
        expect(frames).toHaveLength(0);
    });

    test("attach_WhenTheGestureIsAlreadySideways_ShouldLeaveItToTheBrowser", () => {
        // Arrange
        const { strip } = aStrip(900, 300);
        const event = wheel(80, 10);

        // Act
        strip.dispatchEvent(event);

        // Assert
        expect(event.defaultPrevented).toBe(false);
    });
});
