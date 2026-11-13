import { afterEach, describe, expect, test, vi } from "vitest";
import { ContextMenu } from "../../../../src/SidePanel/Core/Dom/ContextMenu";
import { MenuButton } from "../../../../src/SidePanel/Core/Dom/MenuButton";
import { click } from "../../PanelTestData";

describe("MenuButton", () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    test("click_WhenPressed_ShouldOpenTheItemsAndRunThePickedOne", () => {
        // Arrange
        const run = vi.fn();
        const button = MenuButton.build({
            text: "Copy as",
            title: "Copy this request as a command or a script",
            menu: new ContextMenu(),
            items: () => [
                {
                    label: "Copy as Wget",
                    run,
                },
            ],
        });
        document.body.append(button);

        // Act
        click(button);
        click(document.querySelector(".context-menu-item"));

        // Assert
        expect(button.getAttribute("aria-haspopup")).toBe("menu");
        expect(run).toHaveBeenCalledOnce();
    });
});
