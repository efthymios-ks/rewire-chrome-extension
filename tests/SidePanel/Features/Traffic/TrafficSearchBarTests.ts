import { describe, expect, test } from "vitest";
import { TrafficSearchBar } from "../../../../src/SidePanel/Features/Traffic/TrafficSearchBar";
import { aPanelHarness, click } from "../../PanelTestData";

function chipTexts(bar: TrafficSearchBar): string[] {
    return [...bar.root.querySelectorAll(".chip")].map(chip => chip.textContent ?? "");
}

describe("TrafficSearchBar", () => {
    test("constructor_WhenBuilt_ShouldOfferOnlyTheRegexChip", () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const bar = new TrafficSearchBar(harness.context);

        // Assert
        expect(chipTexts(bar)).toEqual([".*"]);
    });

    test("regexChip_WhenClicked_ShouldTurnRegexSearchOn", () => {
        // Arrange
        const harness = aPanelHarness();
        const bar = new TrafficSearchBar(harness.context);

        // Act
        click(bar.root.querySelector(".chip"));

        // Assert
        expect(harness.store.getState().search.query).toEqual({
            text: "",
            isRegex: true,
        });
        expect(bar.root.querySelector(".chip")?.getAttribute("aria-pressed")).toBe("true");
    });
});
