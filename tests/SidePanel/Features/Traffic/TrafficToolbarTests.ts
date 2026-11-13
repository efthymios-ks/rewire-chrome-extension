import { describe, expect, test, vi } from "vitest";
import { Result } from "../../../../src/Common/Results/Result";
import { ContentKind } from "../../../../src/Contracts/Timeline/ContentKind";
import { FrameFilters } from "../../../../src/SidePanel/Core/FrameFilters";
import { TrafficFeatureSets } from "../../../../src/SidePanel/Core/TrafficFeatures";
import { TrafficLayout } from "../../../../src/SidePanel/Core/TrafficLayout";
import { TrafficToolbar } from "../../../../src/SidePanel/Features/Traffic/TrafficToolbar";
import { aSummary } from "../../../TestData";
import { aPanelHarness, buttonNamed, click } from "../../PanelTestData";

const FramedEntries = [
    aSummary({
        id: "top",
        frame: {
            id: "top-frame",
            url: "https://app.example.com/",
            isTop: true,
        },
    }),
    aSummary({
        id: "payment",
        frame: {
            id: "iframe-1",
            url: "https://pay.example.com/checkout",
            isTop: false,
        },
    }),
];

function aFileClient() {
    return {
        download: vi.fn(),
        pickText: vi.fn(),
        pickNamedText: vi.fn(),
    };
}


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

    test("frameSelect_WhenCallsComeFromAnIframe_ShouldOfferEveryFrame", () => {
        // Arrange
        const harness = aPanelHarness({
            entries: FramedEntries,
        });

        // Act
        const toolbar = new TrafficToolbar(harness.context);

        // Assert
        const select = toolbar.root.querySelector<HTMLSelectElement>(".frame-select")!;
        expect([...select.options].map(option => option.textContent)).toEqual([
            "All frames",
            "top",
            "pay.example.com",
        ]);
        expect(buttonNamed(toolbar.root, "Open frame").hidden).toBe(true);
    });

    test("frameSelect_WhenAnIframeIsPicked_ShouldKeepItsCallsAndOfferToOpenIt", async () => {
        // Arrange
        const harness = aPanelHarness({
            entries: FramedEntries,
        });
        const tabOpener = {
            open: vi.fn().mockResolvedValue(Result.done()),
        };
        const toolbar = new TrafficToolbar(
            harness.context,
            aFileClient(),
            tabOpener
        );
        const select = toolbar.root.querySelector<HTMLSelectElement>(".frame-select")!;

        // Act
        select.value = "iframe-1";
        select.dispatchEvent(new Event("change"));
        click(buttonNamed(toolbar.root, "Open frame"));

        // Assert
        expect(toolbar.root.querySelector(".entry-count")?.textContent).toBe("1 / 2");
        expect(tabOpener.open).toHaveBeenCalledWith("https://pay.example.com/checkout");
    });

    test("frameSelect_WhenThePickedIframeIsCleared_ShouldGoBackToAllFrames", () => {
        // Arrange
        const harness = aPanelHarness({
            entries: FramedEntries,
            frameFilter: "iframe-1",
        });
        new TrafficToolbar(harness.context);

        // Act
        harness.store.update(state => ({
            ...state,
            entries: [],
        }));

        // Assert
        expect(harness.store.getState().frameFilter).toBe(FrameFilters.All);
    });

    test("frameSelect_WhenFramesCannotBeFiltered_ShouldNotShow", () => {
        // Arrange
        const harness = aPanelHarness({
            entries: FramedEntries,
        });

        // Act
        const toolbar = new TrafficToolbar({
            ...harness.context,
            trafficFeatures: TrafficFeatureSets.HarFile,
        });

        // Assert
        expect(toolbar.root.querySelector(".frame-select")).toBeNull();
    });
});
