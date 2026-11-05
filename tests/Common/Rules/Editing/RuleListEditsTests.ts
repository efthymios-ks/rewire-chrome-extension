import { describe, expect, test } from "vitest";
import { RuleListEdits } from "../../../../src/Common/Rules/Editing/RuleListEdits";
import type { Rule } from "../../../../src/Contracts/Rules/Rule";
import { aRule } from "../../../TestData";

function rulesOf(...ids: string[]): Rule[] {
    return ids.map(id => aRule({
        id,
    }));
}

function idsOf(rules: Rule[]): string[] {
    return rules.map(rule => rule.id);
}

describe("RuleListEdits", () => {
    test("move_WhenARuleMovesDown_ShouldPlaceItAtTheTargetIndex", () => {
        // Arrange
        const rules = rulesOf(
            "a1",
            "a2",
            "a3",
            "a4"
        );

        // Act
        const moved = RuleListEdits.move(
            rules,
            "a1",
            2
        );

        // Assert
        expect(idsOf(moved)).toEqual([
            "a2",
            "a3",
            "a1",
            "a4",
        ]);
    });

    test("move_WhenTheIndexIsOutOfRange_ShouldClampIt", () => {
        // Arrange
        const rules = rulesOf(
            "a1",
            "a2",
            "a3"
        );

        // Act
        const moved = RuleListEdits.move(
            rules,
            "a3",
            -5
        );

        // Assert
        expect(idsOf(moved)).toEqual([
            "a3",
            "a1",
            "a2",
        ]);
    });

    test("move_WhenTheRuleIsUnknown_ShouldReturnTheSameList", () => {
        // Arrange
        const rules = rulesOf("a1");

        // Act
        const moved = RuleListEdits.move(
            rules,
            "missing",
            0
        );

        // Assert
        expect(moved).toBe(rules);
    });

    test("insertAfter_WhenTheAnchorExists_ShouldPlaceTheRuleRightAfterIt", () => {
        // Arrange
        const rules = rulesOf(
            "a1",
            "a2"
        );

        // Act
        const inserted = RuleListEdits.insertAfter(
            rules,
            aRule({
                id: "copy",
            }),
            "a1"
        );

        // Assert
        expect(idsOf(inserted)).toEqual([
            "a1",
            "copy",
            "a2",
        ]);
    });

    test("insertAfter_WhenTheAnchorIsNull_ShouldAppend", () => {
        // Arrange
        const rules = rulesOf("a1");

        // Act
        const inserted = RuleListEdits.insertAfter(
            rules,
            aRule({
                id: "new",
            }),
            null
        );

        // Assert
        expect(idsOf(inserted)).toEqual([
            "a1",
            "new",
        ]);
    });

    test("duplicate_WhenCalled_ShouldCopyDeeplyWithANewIdAndName", () => {
        // Arrange
        const rule = aRule();

        // Act
        const copy = RuleListEdits.duplicate(rule, "copy-id");

        // Assert
        expect(copy.id).toBe("copy-id");
        expect(copy.name).toBe(`${rule.name} copy`);
        expect(copy.criteria).toEqual(rule.criteria);
        expect(copy.criteria).not.toBe(rule.criteria);
    });

    test("replace_WhenTheRuleIsNew_ShouldAppendIt", () => {
        // Arrange
        const rules = rulesOf("a1");

        // Act
        const replaced = RuleListEdits.replace(rules, aRule({
            id: "a2",
        }));

        // Assert
        expect(idsOf(replaced)).toEqual([
            "a1",
            "a2",
        ]);
    });

    test("replace_WhenTheRuleExists_ShouldSwapItInPlace", () => {
        // Arrange
        const rules = rulesOf(
            "a1",
            "a2"
        );

        // Act
        const replaced = RuleListEdits.replace(rules, aRule({
            id: "a1",
            name: "Renamed",
        }));

        // Assert
        expect(replaced.map(rule => rule.name)).toEqual([
            "Renamed",
            "Users mock",
        ]);
    });

    test("restore_WhenARemovedRuleComesBack_ShouldReturnToItsIndex", () => {
        // Arrange
        const rules = rulesOf(
            "a1",
            "a2",
            "a3"
        );
        const removed = RuleListEdits.remove(rules, "a2");

        // Act
        const restored = RuleListEdits.restore(
            removed,
            rules[1]!,
            1
        );

        // Assert
        expect(idsOf(restored)).toEqual([
            "a1",
            "a2",
            "a3",
        ]);
    });
});
