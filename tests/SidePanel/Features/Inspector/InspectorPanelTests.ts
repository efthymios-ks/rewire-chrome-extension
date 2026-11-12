import { afterEach, describe, expect, test } from "vitest";
import { SearchFields } from "../../../../src/Contracts/Search/SearchQuery";
import { InspectorPanel } from "../../../../src/SidePanel/Features/Inspector/InspectorPanel";
import { aDetail, aSummary } from "../../../TestData";
import { aPanelHarness, buttonNamed, click, nextRender } from "../../PanelTestData";

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
    afterEach(async () => {
        await nextRender();
        document.body.replaceChildren();
        window.getSelection()?.removeAllRanges();
    });

    test("constructor_WhenBuilt_ShouldOfferOneTabPerPartOfTheCall", () => {
        // Arrange
        const harness = aSelectedHarness();

        // Act
        const panel = new InspectorPanel(harness.context);

        // Assert
        expect([...panel.root.querySelectorAll(":scope > .inspector-tabs .tab")].map(tab => tab.textContent)).toEqual([
            "General",
            "Request Headers",
            "Request Body",
            "Response Headers",
            "Response Body",
            "Code",
        ]);
    });

    test("render_WhenATabIsPicked_ShouldShowOnlyThatPart", async () => {
        // Arrange
        const harness = aSelectedHarness();
        const panel = new InspectorPanel(harness.context);
        await nextRender();

        // Act
        click(buttonNamed(panel.root, "Response Body"));
        await nextRender();

        // Assert
        expect(panel.root.querySelector(".inspector-body .body-tab")).not.toBeNull();
        expect(panel.root.querySelector(".inspector-body .general-tab")).toBeNull();
        expect(buttonNamed(panel.root, "Response Body").getAttribute("aria-selected")).toBe("true");
    });

    test("render_WhenASearchMatchesTheSelectedCall_ShouldMarkTheTabsThatHoldIt", async () => {
        // Arrange
        const harness = aSelectedHarness();
        harness.store.update(state => ({
            ...state,
            search: {
                ...state.search,
                matches: [
                    {
                        entryId: "request-1",
                        fields: [
                            SearchFields.Url,
                            SearchFields.ResponseBody,
                        ],
                        count: 2,
                    },
                ],
            },
        }));

        // Act
        const panel = new InspectorPanel(harness.context);
        await nextRender();

        // Assert
        expect([...panel.root.querySelectorAll(".tab[data-match]")].map(tab => tab.textContent)).toEqual([
            "General",
            "Response Body",
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
