import { describe, expect, test } from "vitest";
import { CurlBashSnippet } from "../../../../src/Common/CodeGen/CurlBashSnippet";
import { WgetSnippet } from "../../../../src/Common/CodeGen/WgetSnippet";
import { CodeTab } from "../../../../src/SidePanel/Features/Inspector/CodeTab";
import { CurrentInspectorPreferences } from "../../../../src/SidePanel/Features/Inspector/InspectorPreferences";
import { aDetail, aSummary } from "../../../TestData";
import { aPanelHarness, buttonNamed, click, nextRender } from "../../PanelTestData";

const Detail = aDetail({
    summary: aSummary({
        method: "POST",
        url: "https://api.example.com/users",
    }),
    requestHeaders: [
        {
            name: "Content-Type",
            value: "application/json",
        },
    ],
    requestBody: "{\"name\":\"Ada\"}",
});

function snapshot(): Parameters<typeof CurlBashSnippet.from>[0] {
    return {
        method: "POST",
        url: "https://api.example.com/users",
        headers: Detail.requestHeaders,
        body: Detail.requestBody,
    };
}

describe("CodeTab", () => {
    test("render_WhenOpened_ShouldOfferOnlyTheFormatChoiceAndTheRequestAfterRules", () => {
        // Arrange
        CurrentInspectorPreferences.snippetId = CurlBashSnippet.id;
        const tab = new CodeTab(aPanelHarness().context);

        // Act
        const root = tab.render(Detail);

        // Assert
        expect(root.querySelectorAll("select")).toHaveLength(1);
        expect(root.querySelector("pre")?.textContent).toBe(CurlBashSnippet.from(snapshot()).toString());
        expect(root.querySelector(".snippet-collapse summary")?.textContent).toBe("Show snippet");
    });

    test("format_WhenChanged_ShouldRenderTheNewFormatAndFoldTheSnippet", () => {
        // Arrange
        CurrentInspectorPreferences.snippetId = CurlBashSnippet.id;
        const tab = new CodeTab(aPanelHarness().context);
        const root = tab.render(Detail);
        const snippet = root.querySelector<HTMLDetailsElement>(".snippet-collapse")!;
        snippet.open = true;
        const select = root.querySelector("select")!;

        // Act
        select.value = WgetSnippet.id;
        select.dispatchEvent(new Event("change"));

        // Assert
        expect(root.querySelector("pre")?.textContent).toBe(WgetSnippet.from(snapshot()).toString());
        expect(snippet.open).toBe(false);
    });

    test("copy_WhenClicked_ShouldCopyTheSnippet", async () => {
        // Arrange
        CurrentInspectorPreferences.snippetId = CurlBashSnippet.id;
        const harness = aPanelHarness();
        const root = new CodeTab(harness.context).render(Detail);

        // Act
        click(buttonNamed(root, "Copy"));
        await nextRender();

        // Assert
        expect(harness.copied).toEqual([CurlBashSnippet.from(snapshot()).toString()]);
    });
});
