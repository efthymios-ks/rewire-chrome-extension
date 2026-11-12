import { describe, expect, test } from "vitest";
import { ContentKind } from "../../../../src/Contracts/Timeline/ContentKind";
import { TrafficLayout } from "../../../../src/SidePanel/Core/TrafficLayout";
import { TrafficToolbar } from "../../../../src/SidePanel/Features/Traffic/TrafficToolbar";
import { aSummary } from "../../../TestData";
import { aPanelHarness, buttonNamed, click } from "../../PanelTestData";

describe("TrafficToolbar", () => {
    test("constructor_WhenBuilt_ShouldPutFiltersAndCountOnTopAndLayoutAndClearBelow", () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const toolbar = new TrafficToolbar(harness.context);

        // Assert
        const rows = toolbar.root.querySelectorAll(".traffic-toolbar-row");
        expect(rows).toHaveLength(2);
        expect(rows[0]?.querySelector(".chip-group")).not.toBeNull();
        expect(rows[0]?.querySelector(".entry-count")).not.toBeNull();
        expect(rows[1]?.querySelector(".traffic-layout")).not.toBeNull();
        expect(rows[1]?.querySelector(".switch")).toBeNull();
        expect(rows[1]?.textContent).toContain("HAR");
        expect(rows[1]?.textContent).toContain("Clear");
        expect(toolbar.root.querySelector(".domain-filter")).toBeNull();
    });

    test("layout_WhenWaterfallIsPicked_ShouldShowTheWaterfall", () => {
        // Arrange
        const harness = aPanelHarness();
        const toolbar = new TrafficToolbar(harness.context);
        const layout = toolbar.root.querySelector<HTMLSelectElement>(".traffic-layout")!;

        // Act
        layout.value = String(TrafficLayout.Waterfall);
        layout.dispatchEvent(new Event("change"));

        // Assert
        expect(harness.store.getState().trafficLayout).toBe(TrafficLayout.Waterfall);
        expect([...layout.options].map(option => option.textContent)).toEqual([
            "List",
            "Waterfall",
        ]);
    });

    test("layout_WhenTheLayoutChangesElsewhere_ShouldFollowIt", () => {
        // Arrange
        const harness = aPanelHarness({
            trafficLayout: TrafficLayout.Waterfall,
        });
        const toolbar = new TrafficToolbar(harness.context);

        // Act
        harness.store.update(state => ({
            ...state,
            trafficLayout: TrafficLayout.List,
        }));

        // Assert
        expect(toolbar.root.querySelector<HTMLSelectElement>(".traffic-layout")!.selectedOptions[0]?.textContent).toBe("List");
    });

    test("count_WhenAContentFilterIsPicked_ShouldCountTheCallsItKeeps", () => {
        // Arrange
        const harness = aPanelHarness({
            entries: [
                aSummary({
                    id: "json",
                    contentKind: ContentKind.Json,
                }),
                aSummary({
                    id: "other",
                    contentKind: ContentKind.Other,
                }),
            ],
        });
        const toolbar = new TrafficToolbar(harness.context);

        // Act
        click(buttonNamed(toolbar.root, "JSON"));

        // Assert
        expect(toolbar.root.querySelector(".entry-count")?.textContent).toBe("1 / 2");
    });
    test("harButton_WhenClicked_ShouldOfferDownloadAndCopyWithAndWithoutSecrets", () => {
        // Arrange
        const harness = aPanelHarness();
        const toolbar = new TrafficToolbar(harness.context);
        document.body.append(toolbar.root);

        // Act
        click(buttonNamed(toolbar.root, "HAR"));

        // Assert
        expect([...document.querySelectorAll(".context-menu-item")].map(item => item.textContent)).toEqual([
            "Download HAR",
            "Copy HAR",
            "Download HAR with cookies and auth headers",
            "Copy HAR with cookies and auth headers",
        ]);
        document.body.replaceChildren();
    });
});
