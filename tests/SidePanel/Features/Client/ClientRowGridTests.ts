import { describe, expect, test } from "vitest";
import type { KeyValueRow } from "../../../../src/SidePanel/Features/Client/ClientRequest";
import { ClientRowGrid } from "../../../../src/SidePanel/Features/Client/ClientRowGrid";
import { buttonNamed, click } from "../../PanelTestData";

function aGrid(rows: KeyValueRow[], keepsOneRow: boolean = true): ClientRowGrid<KeyValueRow> {
    return new ClientRowGrid<KeyValueRow>({
        rows,
        addLabel: "Add field",
        removeLabel: "Remove field",
        keepsOneRow,
        emptyRow: () => ({
            name: "",
            value: "",
        }),
        cellsOf: row => {
            const name = document.createElement("input");
            name.value = row.name;
            const value = document.createElement("input");
            value.value = row.value;

            return {
                name,
                value,
            };
        },
    });
}

describe("ClientRowGrid", () => {
    test("constructor_WhenThereAreNoRowsAndOneIsKept_ShouldShowOneBlankRow", () => {
        // Arrange
        const rows: KeyValueRow[] = [];

        // Act
        const grid = aGrid(rows);

        // Assert
        expect(grid.root.querySelectorAll(".client-row")).toHaveLength(1);
        expect(rows).toHaveLength(1);
    });

    test("add_WhenClicked_ShouldAppendABlankRowToTheSameList", () => {
        // Arrange
        const rows = [
            {
                name: "a",
                value: "1",
            },
        ];
        const grid = aGrid(rows);

        // Act
        click(buttonNamed(grid.root, "Add field"));

        // Assert
        expect(grid.root.querySelectorAll(".client-row")).toHaveLength(2);
        expect(rows).toHaveLength(2);
    });

    test("remove_WhenClicked_ShouldDropThatRowFromTheSameList", () => {
        // Arrange
        const rows = [
            {
                name: "a",
                value: "1",
            },
            {
                name: "b",
                value: "2",
            },
        ];
        const grid = aGrid(rows, false);

        // Act
        click(grid.root.querySelectorAll(".row-remove")[0]);

        // Assert
        expect(rows.map(row => row.name)).toEqual(["b"]);
        expect(grid.rows()).toBe(rows);
    });

    test("render_WhenBuilt_ShouldLabelTheRemoveButtonForScreenReaders", () => {
        // Arrange
        const rows = [
            {
                name: "a",
                value: "1",
            },
        ];

        // Act
        const grid = aGrid(rows);

        // Assert
        expect(grid.root.querySelector(".row-remove")?.getAttribute("aria-label")).toBe("Remove field");
    });
});
