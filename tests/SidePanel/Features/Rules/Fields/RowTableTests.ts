import { describe, expect, test, vi } from "vitest";
import { ColumnKind, RowTable } from "../../../../../src/SidePanel/Features/Rules/Fields/RowTable";
import { typeInto } from "../../../PanelTestData";

function suggestionsOf(input: HTMLInputElement): string[] {
    const list = input.parentElement!.querySelector<HTMLElement>(".suggestion-list")!;

    return list.hidden ? [] : [...list.querySelectorAll(".suggestion-item")].map(item => item.textContent ?? "");
}

describe("RowTable", () => {
    test("suggestedColumn_WhenItDependsOnTheRow_ShouldAskWithTheRowAsItIsNow", () => {
        // Arrange
        const table = new RowTable({
            columns: [
                {
                    key: "name",
                    label: "Name",
                    kind: ColumnKind.Text,
                },
                {
                    key: "value",
                    label: "Value",
                    kind: ColumnKind.Suggested,
                    suggestionsOf: row => row["name"] === "Mode"
                        ? [
                            "fast",
                            "safe",
                        ]
                        : [],
                },
            ],
            rows: [
                {
                    name: "",
                    value: "",
                },
            ],
            addLabel: "Add row",
            onChange: vi.fn(),
        });
        const [name, value] = [...table.root.querySelectorAll<HTMLInputElement>("tbody input")];

        // Act
        typeInto(value!, "s");
        const before = suggestionsOf(value!);
        typeInto(name!, "Mode");
        typeInto(value!, "s");
        const after = suggestionsOf(value!);

        // Assert
        expect(before).toEqual([]);
        expect(after).toEqual([
            "safe",
            "fast",
        ]);
    });

    test("onChange_WhenACellIsTyped_ShouldPublishTheRows", () => {
        // Arrange
        const onChange = vi.fn();
        const table = new RowTable({
            columns: [
                {
                    key: "name",
                    label: "Name",
                    kind: ColumnKind.Text,
                },
            ],
            rows: [
                {
                    name: "",
                },
            ],
            addLabel: "Add row",
            onChange,
        });

        // Act
        typeInto(table.root.querySelector<HTMLInputElement>("tbody input")!, "X-Debug");

        // Assert
        expect(onChange).toHaveBeenLastCalledWith([
            {
                name: "X-Debug",
            },
        ]);
    });
});
