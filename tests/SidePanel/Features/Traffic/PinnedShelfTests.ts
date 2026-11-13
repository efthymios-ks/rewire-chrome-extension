import { describe, expect, test } from "vitest";
import { TrafficFeatureSets } from "../../../../src/SidePanel/Core/TrafficFeatures";
import { PinnedShelf } from "../../../../src/SidePanel/Features/Traffic/PinnedShelf";
import { aSettings, aSummary } from "../../../TestData";
import { aPanelHarness } from "../../PanelTestData";

function aPinnedHarness() {
    const entry = aSummary();

    return aPanelHarness({
        settings: aSettings({
            pinnedEndpoints: [entry.endpointKey],
        }),
        entries: [entry],
    });
}

describe("PinnedShelf", () => {
    test("constructor_WhenAnEndpointIsPinned_ShouldShowItsLatestCall", () => {
        // Arrange
        const harness = aPinnedHarness();

        // Act
        const shelf = new PinnedShelf(harness.context);

        // Assert
        expect(shelf.root.hidden).toBe(false);
        expect(shelf.root.textContent).toContain("/api/v1/users/42/profile");
    });

    test("constructor_WhenPinningIsNotOffered_ShouldStayHidden", () => {
        // Arrange
        const harness = aPinnedHarness();

        // Act
        const shelf = new PinnedShelf({
            ...harness.context,
            trafficFeatures: TrafficFeatureSets.HarFile,
        });

        // Assert
        expect(shelf.root.hidden).toBe(true);
    });
});
