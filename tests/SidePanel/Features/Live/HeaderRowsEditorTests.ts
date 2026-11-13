import { describe, expect, test } from "vitest";
import { HeaderRowsEditor } from "../../../../src/SidePanel/Features/Live/HeaderRowsEditor";
import { buttonNamed, click } from "../../PanelTestData";

function typeInto(input: HTMLInputElement | undefined, value: string): void {
    input!.value = value;
    input!.dispatchEvent(new Event("input"));
}

describe("HeaderRowsEditor", () => {
    test("values_WhenRowsAreFilledAndRemoved_ShouldReturnTheNamedOnesAndCountThem", () => {
        // Arrange
        const editor = new HeaderRowsEditor();
        click(buttonNamed(editor.root, "Add header"));
        click(buttonNamed(editor.root, "Add header"));
        click(buttonNamed(editor.root, "Add header"));
        const inputs = [...editor.root.querySelectorAll<HTMLInputElement>(".header-row input")];
        typeInto(inputs[0], "Authorization");
        typeInto(inputs[1], "Bearer {{token}}");
        typeInto(inputs[2], "X-Trace");

        // Act
        click(editor.root.querySelectorAll(".header-row button")[1]);

        // Assert
        expect(editor.values()).toEqual([
            {
                name: "Authorization",
                value: "Bearer {{token}}",
            },
        ]);
        expect(editor.root.querySelector("summary")?.textContent).toBe("Headers · 1");
    });
});
