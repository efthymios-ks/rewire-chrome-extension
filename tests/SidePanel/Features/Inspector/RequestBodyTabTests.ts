import { describe, expect, test } from "vitest";
import { PanelStateFactory } from "../../../../src/SidePanel/Core/PanelStateFactory";
import { RequestBodyTab } from "../../../../src/SidePanel/Features/Inspector/RequestBodyTab";
import { aDetail } from "../../../TestData";
import { aPanelHarness, buttonNamed, click, nextRender } from "../../PanelTestData";

describe("RequestBodyTab", () => {
    test("render_WhenThereIsNoBody_ShouldSaySoWithoutACopyButton", () => {
        // Arrange
        const detail = aDetail({
            requestBody: null,
        });

        // Act
        const root = new RequestBodyTab(aPanelHarness().context).render(detail, PanelStateFactory.initial());

        // Assert
        expect(root.textContent).toBe("No body.");
        expect(root.querySelector("button")).toBeNull();
    });

    test("copy_WhenClicked_ShouldCopyTheRequestBody", async () => {
        // Arrange
        const harness = aPanelHarness();
        const detail = aDetail({
            requestBody: "{\"name\":\"Ada\"}",
        });
        const root = new RequestBodyTab(harness.context).render(detail, PanelStateFactory.initial());

        // Act
        click(buttonNamed(root, "Copy request body"));
        await nextRender();

        // Assert
        expect(harness.copied).toEqual(["{\"name\":\"Ada\"}"]);
        expect(harness.noticeText()).toBe("Body copied.");
    });
});
