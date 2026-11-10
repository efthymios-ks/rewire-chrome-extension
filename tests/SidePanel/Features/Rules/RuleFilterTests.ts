import { describe, expect, test } from "vitest";
import { RuleTypeIds } from "../../../../src/Contracts/Rules/RuleTypeIds";
import { RuleFilters } from "../../../../src/SidePanel/Features/Rules/RuleFilter";
import { aRule } from "../../../TestData";

describe("RuleFilters", () => {
    test("apply_WhenTextIsSet_ShouldKeepRulesWhoseNameMatchesWhateverTheirType", () => {
        // Arrange
        const rules = [
            aRule({
                id: "users",
                name: "Users mock",
            }),
            aRule({
                id: "orders",
                name: "Orders mock",
            }),
            aRule({
                id: "delay",
                name: "Users delay",
                type: RuleTypeIds.Delay,
            }),
        ];

        // Act
        const filtered = RuleFilters.apply(rules, {
            text: " USERS ",
        });

        // Assert
        expect(filtered.map(rule => rule.id)).toEqual([
            "users",
            "delay",
        ]);
    });

    test("apply_WhenNothingIsSet_ShouldKeepEveryRule", () => {
        // Arrange
        const rules = [
            aRule(),
            aRule({
                id: "rule-2",
            }),
        ];

        // Act
        const filtered = RuleFilters.apply(rules, {
            text: "",
        });

        // Assert
        expect(filtered).toEqual(rules);
    });
});
