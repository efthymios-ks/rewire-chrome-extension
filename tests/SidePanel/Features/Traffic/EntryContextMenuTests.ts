import { describe, expect, test } from "vitest";
import { ViewId } from "../../../../src/SidePanel/Core/ViewId";
import { EntryContextMenu } from "../../../../src/SidePanel/Features/Traffic/EntryContextMenu";
import { aDetail, aSummary } from "../../../TestData";
import { aPanelHarness, nextRender } from "../../PanelTestData";

describe("EntryContextMenu", () => {
    test("openInClient_WhenTheCallIsSelected_ShouldOpenTheClientWithTheRequestAfterRules", async () => {
        // Arrange
        const detail = aDetail({
            summary: aSummary({
                id: "request-1",
                method: "POST",
                url: "https://api.example.com/users",
            }),
            requestBody: "{\"name\":\"Ada\"}",
        });
        const harness = aPanelHarness({
            selectedEntryId: "request-1",
            selectedEntryDetail: detail,
        });
        const menu = new EntryContextMenu(harness.context);

        // Act
        menu.itemsFor(detail.summary)[0]!.run();
        await nextRender();

        // Assert
        const state = harness.store.getState();
        expect(state.activeView).toBe(ViewId.Client);
        expect(state.clientLaunch?.snapshot).toEqual({
            method: "POST",
            url: "https://api.example.com/users",
            headers: detail.requestHeaders,
            body: "{\"name\":\"Ada\"}",
        });
        expect(harness.sent).toEqual([]);
    });

    test("copy_WhenTheCallIsNotSelected_ShouldLoadItAndCopyTheSnippet", async () => {
        // Arrange
        const detail = aDetail({
            summary: aSummary({
                id: "request-2",
                url: "https://api.example.com/orders",
            }),
        });
        const harness = aPanelHarness({}, detail);
        const menu = new EntryContextMenu(harness.context);

        // Act
        menu.itemsFor(detail.summary)[1]!.run();
        await nextRender();

        // Assert
        expect(harness.sent).toHaveLength(1);
        expect(harness.copied[0]).toContain("curl 'https://api.example.com/orders'");
        expect(harness.noticeText()).toBe("cURL (bash) snippet copied.");
    });
});
