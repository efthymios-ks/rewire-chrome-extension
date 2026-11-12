import { describe, expect, test } from "vitest";
import { KeptTimelines } from "../../../../src/Background/Features/Inspection/KeptTimelines";

describe("KeptTimelines", () => {
    test("keep_WhenUnderTheLimit_ShouldDropNothing", () => {
        // Arrange
        const kept = new KeptTimelines(2);
        kept.keep(1);

        // Act
        const dropped = kept.keep(2);

        // Assert
        expect(dropped).toEqual([]);
    });

    test("keep_WhenOverTheLimit_ShouldDropTheLeastRecentlyLeftTab", () => {
        // Arrange
        const kept = new KeptTimelines(2);
        kept.keep(1);
        kept.keep(2);

        // Act
        const dropped = kept.keep(3);

        // Assert
        expect(dropped).toEqual([1]);
        expect(kept.takeAll()).toEqual([
            2,
            3,
        ]);
    });

    test("keep_WhenTheTabIsAlreadyKept_ShouldMoveItToTheEnd", () => {
        // Arrange
        const kept = new KeptTimelines(2);
        kept.keep(1);
        kept.keep(2);
        kept.keep(1);

        // Act
        const dropped = kept.keep(3);

        // Assert
        expect(dropped).toEqual([2]);
    });

    test("resume_WhenATabIsInspectedAgain_ShouldStopCountingIt", () => {
        // Arrange
        const kept = new KeptTimelines(1);
        kept.keep(1);
        kept.resume(1);

        // Act
        const dropped = kept.keep(2);

        // Assert
        expect(dropped).toEqual([]);
    });

    test("takeAll_WhenCalled_ShouldEmptyTheList", () => {
        // Arrange
        const kept = new KeptTimelines(3);
        kept.keep(1);
        kept.takeAll();

        // Act
        const all = kept.takeAll();

        // Assert
        expect(all).toEqual([]);
    });
});
