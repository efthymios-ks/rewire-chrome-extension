import { describe, expect, test } from "vitest";
import { DiffKind } from "../../../src/Common/Diff/DiffKind";
import type { DiffNode } from "../../../src/Common/Diff/DiffNode";
import { JsonDiffer } from "../../../src/Common/Diff/JsonDiffer";

function childOf(node: DiffNode, key: string): DiffNode | undefined {
    return node.children.find(child => child.key === key);
}

describe("JsonDiffer", () => {
    test("diff_WhenBothSidesAreEqual_ShouldBeUnchanged", () => {
        // Arrange
        const payload = {
            id: 1,
            tags: [
                "a",
                "b",
            ],
        };

        // Act
        const diff = JsonDiffer.diff(payload, structuredClone(payload));

        // Assert
        expect(diff.kind).toBe(DiffKind.Unchanged);
        expect(JsonDiffer.summarize(diff)).toEqual({
            added: 0,
            removed: 0,
            changed: 0,
        });
    });

    test("diff_WhenKeysAreAddedRemovedAndChanged_ShouldReportEachChange", () => {
        // Arrange
        const live = {
            id: 1,
            name: "Ada",
            role: "admin",
        };
        const mock = {
            id: 1,
            name: "Grace",
            plan: "pro",
        };

        // Act
        const diff = JsonDiffer.diff(live, mock);

        // Assert
        expect(diff.kind).toBe(DiffKind.Modified);
        expect(childOf(diff, "id")?.kind).toBe(DiffKind.Unchanged);
        expect(childOf(diff, "name")?.kind).toBe(DiffKind.Changed);
        expect(childOf(diff, "role")?.kind).toBe(DiffKind.Removed);
        expect(childOf(diff, "plan")?.kind).toBe(DiffKind.Added);
        expect(JsonDiffer.summarize(diff)).toEqual({
            added: 1,
            removed: 1,
            changed: 1,
        });
    });

    test("diff_WhenArrayLengthsDiffer_ShouldCompareByIndex", () => {
        // Arrange
        const live = [
            1,
            2,
            3,
        ];
        const mock = [
            1,
            5,
        ];

        // Act
        const diff = JsonDiffer.diff(live, mock);

        // Assert
        expect(diff.children.map(child => child.kind)).toEqual([
            DiffKind.Unchanged,
            DiffKind.Changed,
            DiffKind.Removed,
        ]);
    });

    test("diff_WhenValueTypeChanges_ShouldReportChanged", () => {
        // Arrange
        const live = {
            items: [],
        };
        const mock = {
            items: null,
        };

        // Act
        const diff = JsonDiffer.diff(live, mock);

        // Assert
        expect(childOf(diff, "items")?.kind).toBe(DiffKind.Changed);
    });

    test("diff_WhenANestedValueChanges_ShouldMarkParentModified", () => {
        // Arrange
        const live = {
            user: {
                address: {
                    city: "Athens",
                },
            },
        };
        const mock = {
            user: {
                address: {
                    city: "Thessaloniki",
                },
            },
        };

        // Act
        const diff = JsonDiffer.diff(live, mock);

        // Assert
        const user = childOf(diff, "user");
        expect(user?.kind).toBe(DiffKind.Modified);
        expect(user === undefined ? undefined : childOf(user, "address")?.kind).toBe(DiffKind.Modified);
    });
});
