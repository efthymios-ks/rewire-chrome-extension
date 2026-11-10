import { describe, expect, test } from "vitest";
import { ContentKind } from "../../../../src/Contracts/Timeline/ContentKind";
import { ContentFilterId } from "../../../../src/SidePanel/Core/ContentFilterId";
import { WaterfallView } from "../../../../src/SidePanel/Features/Traffic/WaterfallView";
import { aSummary } from "../../../TestData";
import { aPanelHarness, nextRender } from "../../PanelTestData";

describe("WaterfallView", () => {
    test("render_WhenAContentFilterIsActive_ShouldChartOnlyTheCallsItKeeps", async () => {
        // Arrange
        const harness = aPanelHarness({
            entries: [
                aSummary({
                    id: "json",
                    path: "/api/users",
                    contentKind: ContentKind.Json,
                }),
                aSummary({
                    id: "other",
                    path: "/api/other",
                    contentKind: ContentKind.Other,
                    host: "cdn.example.net",
                }),
            ],
            contentFilter: ContentFilterId.Json,
        });

        // Act
        const view = new WaterfallView(harness.context);
        await nextRender();

        // Assert
        expect([...view.root.querySelectorAll(".waterfall-label")].map(label => label.textContent)).toEqual(["GET /api/users"]);
    });

    test("render_WhenThereAreNoCalls_ShouldSayThereIsNothingToChart", async () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const view = new WaterfallView(harness.context);
        await nextRender();

        // Assert
        expect(view.root.textContent).toContain("No requests to chart yet.");
    });
});
