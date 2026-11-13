import { describe, expect, test } from "vitest";
import { ViewId } from "../../../../src/SidePanel/Core/ViewId";
import { NavigationTabs } from "../../../../src/SidePanel/Features/Shell/NavigationTabs";
import type { ViewDefinition } from "../../../../src/SidePanel/Features/Shell/ViewDefinition";
import { aSummary } from "../../../TestData";
import { aPanelHarness, buttonNamed, click } from "../../PanelTestData";

const Definitions: ViewDefinition[] = [
    {
        id: ViewId.Traffic,
        label: "Traffic",
        badgeOf: state => state.entries.length === 0 ? "" : String(state.entries.length),
        create: () => document.createElement("div"),
    },
    {
        id: ViewId.Jwt,
        label: "JWT",
        badgeOf: () => "",
        create: () => document.createElement("div"),
    },
];

describe("NavigationTabs", () => {
    test("constructor_WhenBuilt_ShouldShowEachTabWithItsBadge", () => {
        // Arrange
        const harness = aPanelHarness({
            entries: [aSummary()],
        });

        // Act
        const tabs = new NavigationTabs(harness.context, Definitions);

        // Assert
        const badges = [...tabs.root.querySelectorAll<HTMLElement>(".tab-badge")];
        expect(badges.map(badge => `${badge.textContent}:${badge.hidden}`)).toEqual([
            "1:false",
            ":true",
        ]);
        expect(tabs.root.querySelector(".tab")?.getAttribute("aria-selected")).toBe("true");
    });

    test("click_WhenATabIsPicked_ShouldShowItsView", () => {
        // Arrange
        const harness = aPanelHarness();
        const tabs = new NavigationTabs(harness.context, Definitions);

        // Act
        click(buttonNamed(tabs.root, "JWT"));

        // Assert
        expect(harness.store.getState().activeView).toBe(ViewId.Jwt);
        expect(buttonNamed(tabs.root, "JWT").getAttribute("aria-selected")).toBe("true");
    });

    test("wheel_WhenTheTabsOverflow_ShouldTakeOverTheWheel", () => {
        // Arrange
        const tabs = new NavigationTabs(aPanelHarness().context, Definitions);
        Object.defineProperty(tabs.root, "scrollWidth", {
            value: 900,
        });
        Object.defineProperty(tabs.root, "clientWidth", {
            value: 300,
        });
        const event = new WheelEvent("wheel", {
            deltaY: 120,
            cancelable: true,
        });

        // Act
        tabs.root.dispatchEvent(event);

        // Assert
        expect(event.defaultPrevented).toBe(true);
    });
});
