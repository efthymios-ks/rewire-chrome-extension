import { afterEach, describe, expect, test } from "vitest";
import { InspectorPanel } from "../../../../src/SidePanel/Features/Inspector/InspectorPanel";
import { aDetail, aSummary } from "../../../TestData";
import { aPanelHarness, nextRender } from "../../PanelTestData";

function aSelectedHarness(): ReturnType<typeof aPanelHarness> {
    const summary = aSummary({
        id: "request-1",
    });

    return aPanelHarness({
        entries: [summary],
        selectedEntryId: "request-1",
        selectedEntryDetail: aDetail({
            summary,
        }),
    });
}

function rightClick(element: Element): MouseEvent {
    const event = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
    });
    element.dispatchEvent(event);

    return event;
}

describe("InspectorPanel", () => {
    afterEach(() => {
        document.body.replaceChildren();
        window.getSelection()?.removeAllRanges();
    });

    test("constructor_WhenBuilt_ShouldOfferInspectAndCodeOnly", () => {
        // Arrange
        const harness = aSelectedHarness();

        // Act
        const panel = new InspectorPanel(harness.context);

        // Assert
        expect([...panel.root.querySelectorAll(":scope > .inspector-tabs .tab")].map(tab => tab.textContent)).toEqual([
            "Inspect",
            "Code",
        ]);
    });

    test("contextMenu_WhenACallIsSelected_ShouldOfferOpenInClient", async () => {
        // Arrange
        const harness = aSelectedHarness();
        const panel = new InspectorPanel(harness.context);
        document.body.append(panel.root);
        await nextRender();

        // Act
        const event = rightClick(panel.root.querySelector(".inspector-body")!);

        // Assert
        expect(event.defaultPrevented).toBe(true);
        expect(document.querySelector(".context-menu-item")?.textContent).toBe("Open in Client");
    });

    test("contextMenu_WhenNothingIsSelected_ShouldKeepTheBrowserMenu", () => {
        // Arrange
        const harness = aPanelHarness();
        const panel = new InspectorPanel(harness.context);
        document.body.append(panel.root);

        // Act
        const event = rightClick(panel.root);

        // Assert
        expect(event.defaultPrevented).toBe(false);
        expect(document.querySelector(".context-menu")).toBeNull();
    });
});
