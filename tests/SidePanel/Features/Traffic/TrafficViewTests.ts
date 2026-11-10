import { beforeEach, describe, expect, test } from "vitest";
import { TrafficView } from "../../../../src/SidePanel/Features/Traffic/TrafficView";
import { aSummary } from "../../../TestData";
import { aPanelHarness, click, nextRender } from "../../PanelTestData";

const CollapsedKey = "rewire.inspectorCollapsed";

function aCollapsedView(selectedEntryId: string | null = null): TrafficView {
    localStorage.setItem(CollapsedKey, "true");
    const harness = aPanelHarness({
        entries: [
            aSummary({
                id: "request-1",
            }),
        ],
        selectedEntryId,
    });

    return new TrafficView(harness.context);
}

function splitOf(view: TrafficView): HTMLElement {
    return view.root.querySelector<HTMLElement>(".split-pane")!;
}

describe("TrafficView", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test("constructor_WhenTheInspectorWasHidden_ShouldKeepItHiddenUntilACallIsPicked", async () => {
        // Arrange
        const expected = "true";

        // Act
        const view = aCollapsedView();
        await nextRender();

        // Assert
        expect(splitOf(view).dataset["collapsed"]).toBe(expected);
    });

    test("rowClick_WhenTheInspectorIsHidden_ShouldOpenIt", async () => {
        // Arrange
        const view = aCollapsedView();
        await nextRender();

        // Act
        click(view.root.querySelector(".timeline-row"));

        // Assert
        expect(splitOf(view).dataset["collapsed"]).toBe("false");
    });

    test("rowClick_WhenTheHiddenInspectorAlreadyShowsThatCall_ShouldStillOpenIt", async () => {
        // Arrange
        const view = aCollapsedView("request-1");
        await nextRender();

        // Act
        click(view.root.querySelector(".timeline-row"));

        // Assert
        expect(splitOf(view).dataset["collapsed"]).toBe("false");
    });
});
