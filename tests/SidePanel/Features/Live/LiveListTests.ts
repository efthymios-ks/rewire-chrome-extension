import { describe, expect, test, vi } from "vitest";
import { Base64Text } from "../../../../src/Common/Encoding/Base64Text";
import { LiveList, type LiveListItem } from "../../../../src/SidePanel/Features/Live/LiveList";
import { aPanelHarness, buttonNamed, click } from "../../PanelTestData";

function tokenPartOf(value: object): string {
    return Base64Text
        .fromUtf8(JSON.stringify(value))
        .replace(/=+$/, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

const Token = `${tokenPartOf({
    alg: "HS256",
})}.${tokenPartOf({
    sub: "user-42",
})}.signature`;

function anItem(overrides: Partial<LiveListItem> = {}): LiveListItem {
    return {
        id: "item-1",
        title: ["message"],
        at: "2026-11-12T10:00:01.250Z",
        data: "{\"type\":\"hello\"}",
        hasDataLine: true,
        isMuted: false,
        facts: [
            "event message",
            "16 B",
        ],
        actions: [],
        ...overrides,
    };
}

describe("LiveList", () => {
    test("update_WhenItemsArrive_ShouldShowTheNewestFirst", () => {
        // Arrange
        const list = new LiveList(aPanelHarness().context, "No events.");

        // Act
        list.update([
            anItem({
                id: "old",
                title: ["old"],
            }),
            anItem({
                id: "new",
                title: ["new"],
            }),
        ]);

        // Assert
        expect([...list.root.querySelectorAll(".live-item-title")].map(title => title.textContent)).toEqual([
            "new",
            "old",
        ]);
    });

    test("update_WhenThereAreNoItems_ShouldSayTheEmptyText", () => {
        // Arrange
        const list = new LiveList(aPanelHarness().context, "No events.");

        // Act
        list.update([]);

        // Assert
        expect(list.root.textContent).toBe("No events.");
    });

    test("click_WhenAnItemIsClickedTwice_ShouldOpenThenCloseItsDetails", () => {
        // Arrange
        const list = new LiveList(aPanelHarness().context, "No events.");
        list.update([anItem()]);

        // Act
        click(list.root.querySelector(".live-item-head"));
        const opened = list.root.querySelector(".live-item-details");
        click(list.root.querySelector(".live-item-head"));

        // Assert
        expect(opened?.querySelector(".live-facts")?.textContent).toBe("event message · 16 B");
        expect(opened?.querySelector(".json-tree")).not.toBeNull();
        expect(list.root.querySelector(".live-item-details")).toBeNull();
    });

    test("click_WhenThePayloadHoldsAJwt_ShouldOfferToOpenIt", () => {
        // Arrange
        const harness = aPanelHarness();
        const openJwt = vi.spyOn(harness.context.viewLauncher, "openJwt");
        const list = new LiveList(harness.context, "No events.");
        list.update([
            anItem({
                data: `token=${Token}`,
            }),
        ]);
        click(list.root.querySelector(".live-item-head"));

        // Act
        click(buttonNamed(list.root, "Open JWT"));

        // Assert
        expect(openJwt).toHaveBeenCalledWith(Token);
        expect(list.root.querySelector(".live-raw")?.textContent).toBe(`token=${Token}`);
    });

    test("update_WhenAnItemHasNoData_ShouldShowOneMutedLine", () => {
        // Arrange
        const list = new LiveList(aPanelHarness().context, "No events.");

        // Act
        list.update([
            anItem({
                data: null,
                isMuted: true,
            }),
        ]);

        // Assert
        expect(list.root.querySelector(".live-item")?.classList.contains("muted-item")).toBe(true);
        expect(list.root.querySelector(".live-item-preview")).toBeNull();
    });

    test("update_WhenANewItemArrives_ShouldKeepTheRowsAndTheScrollPosition", () => {
        // Arrange
        const list = new LiveList(aPanelHarness().context, "No events.");
        list.update([
            anItem({
                id: "old",
            }),
        ]);
        const oldRow = list.root.querySelector(".live-item");
        list.root.scrollTop = 50;

        // Act
        list.update([
            anItem({
                id: "old",
            }),
            anItem({
                id: "new",
            }),
        ]);

        // Assert
        expect(list.root.querySelectorAll(".live-item")[1]).toBe(oldRow);
        expect(list.root.scrollTop).toBe(50);
    });
});
