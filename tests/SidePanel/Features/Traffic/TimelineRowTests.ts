import { describe, expect, test, vi } from "vitest";
import { TimelineRow } from "../../../../src/SidePanel/Features/Traffic/TimelineRow";
import { aSummary } from "../../../TestData";
import { click } from "../../PanelTestData";

function actionsWith(onTogglePin: ((entry: ReturnType<typeof aSummary>) => void) | null) {
    return {
        onSelect: vi.fn(),
        onTogglePin,
        onContextMenu: vi.fn(),
    };
}

describe("TimelineRow", () => {
    test("build_WhenPinningIsOffered_ShouldTogglePinFromTheStar", () => {
        // Arrange
        const onTogglePin = vi.fn();
        const row = TimelineRow.build(
            aSummary(),
            false,
            actionsWith(onTogglePin)
        );

        // Act
        click(row.querySelector(".pin-toggle"));

        // Assert
        expect(onTogglePin).toHaveBeenCalledWith(aSummary());
    });

    test("build_WhenPinningIsNotOffered_ShouldShowNoStar", () => {
        // Arrange
        const actions = actionsWith(null);

        // Act
        const row = TimelineRow.build(
            aSummary(),
            false,
            actions
        );

        // Assert
        expect(row.querySelector(".pin-toggle")).toBeNull();
    });
});
