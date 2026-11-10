import { beforeEach, describe, expect, test } from "vitest";
import { SplitPane } from "../../../../src/SidePanel/Features/Traffic/SplitPane";
import { click } from "../../PanelTestData";

const CollapsedKey = "rewire.inspectorCollapsed";

function aPane(): SplitPane {
    return new SplitPane(document.createElement("div"), document.createElement("div"));
}

function toggleOf(pane: SplitPane): HTMLButtonElement {
    return pane.root.querySelector<HTMLButtonElement>(".split-toggle")!;
}

describe("SplitPane", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test("constructor_WhenNothingIsRemembered_ShouldShowTheInspector", () => {
        // Arrange
        const expected = "false";

        // Act
        const pane = aPane();

        // Assert
        expect(pane.root.dataset["collapsed"]).toBe(expected);
        expect(toggleOf(pane).getAttribute("aria-label")).toBe("Hide the inspector");
        expect(toggleOf(pane).getAttribute("aria-expanded")).toBe("true");
    });

    test("toggle_WhenClicked_ShouldSlideTheInspectorAwayAndRememberIt", () => {
        // Arrange
        const pane = aPane();

        // Act
        click(toggleOf(pane));

        // Assert
        expect(pane.root.dataset["collapsed"]).toBe("true");
        expect(toggleOf(pane).getAttribute("aria-label")).toBe("Show the inspector");
        expect(localStorage.getItem(CollapsedKey)).toBe("true");
    });

    test("constructor_WhenTheInspectorWasHidden_ShouldStartHidden", () => {
        // Arrange
        localStorage.setItem(CollapsedKey, "true");

        // Act
        const pane = aPane();

        // Assert
        expect(pane.root.dataset["collapsed"]).toBe("true");
    });

    test("expand_WhenTheInspectorIsHidden_ShouldBringItBackAndRememberIt", () => {
        // Arrange
        localStorage.setItem(CollapsedKey, "true");
        const pane = aPane();

        // Act
        pane.expand();

        // Assert
        expect(pane.root.dataset["collapsed"]).toBe("false");
        expect(localStorage.getItem(CollapsedKey)).toBe("false");
    });

    test("handleKeys_WhenAnArrowMovesTheHandle_ShouldBringTheInspectorBack", () => {
        // Arrange
        localStorage.setItem(CollapsedKey, "true");
        const pane = aPane();

        // Act
        pane.root.querySelector(".split-handle")!.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowUp",
        }));

        // Assert
        expect(pane.root.dataset["collapsed"]).toBe("false");
    });
});
