import { describe, expect, test } from "vitest";
import { PanelStateFactory } from "../../../../src/SidePanel/Core/PanelStateFactory";
import { ResponseBodyTab } from "../../../../src/SidePanel/Features/Inspector/ResponseBodyTab";
import { aDetail } from "../../../TestData";
import { aPanelHarness, buttonNamed, click, nextRender } from "../../PanelTestData";

describe("ResponseBodyTab", () => {
    test("render_WhenTheBodyWasSkipped_ShouldShowTheNote", () => {
        // Arrange
        const detail = aDetail({
            responseBody: null,
            responseBodyNote: "Binary bodies are not captured.",
        });

        // Act
        const root = new ResponseBodyTab(aPanelHarness().context).render(detail, PanelStateFactory.initial());

        // Assert
        expect(root.textContent).toBe("Binary bodies are not captured.");
    });

    test("render_WhenSearching_ShouldHighlightTheMatchesInRawText", () => {
        // Arrange
        const state = PanelStateFactory.initial();
        const searching = {
            ...state,
            search: {
                ...state.search,
                query: {
                    text: "ada",
                    isRegex: false,
                },
            },
        };
        const detail = aDetail({
            responseBody: "{\"name\":\"Ada\"}",
        });

        // Act
        const root = new ResponseBodyTab(aPanelHarness().context).render(detail, searching);

        // Assert
        expect([...root.querySelectorAll("mark")].map(mark => mark.textContent)).toEqual(["Ada"]);
    });

    test("copy_WhenClicked_ShouldCopyTheResponseBody", async () => {
        // Arrange
        const harness = aPanelHarness();
        const detail = aDetail({
            responseBody: "{\"id\":42}",
        });
        const root = new ResponseBodyTab(harness.context).render(detail, PanelStateFactory.initial());

        // Act
        click(buttonNamed(root, "Copy response body"));
        await nextRender();

        // Assert
        expect(harness.copied).toEqual(["{\"id\":42}"]);
    });
});
