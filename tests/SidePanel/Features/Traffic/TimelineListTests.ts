import { afterEach, describe, expect, test } from "vitest";
import { TimelineList } from "../../../../src/SidePanel/Features/Traffic/TimelineList";
import { aSummary } from "../../../TestData";
import { aPanelHarness, nextRender } from "../../PanelTestData";

describe("TimelineList", () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    test("contextMenu_WhenARowIsRightClicked_ShouldOfferOpenInClientFirst", async () => {
        // Arrange
        const harness = aPanelHarness({
            entries: [aSummary()],
        });
        const list = new TimelineList(harness.context);
        document.body.append(list.root);
        await nextRender();

        // Act
        list.root.querySelector(".timeline-row")!.dispatchEvent(new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
        }));

        // Assert
        const items = [...document.querySelectorAll(".context-menu-item")].map(item => item.textContent);
        expect(items[0]).toBe("Open in HTTP Client");
        expect(items.slice(1)).toEqual([
            "Copy as cURL (bash)",
            "Copy as cURL (cmd)",
            "Copy as Wget",
            "Copy as Fetch (browser)",
            "Copy as Fetch (Node.js)",
            "Copy as PowerShell",
        ]);
    });
});
