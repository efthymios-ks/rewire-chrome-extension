import { describe, expect, test } from "vitest";
import { BrowserRuleCompiler, BrowserRulePriorities } from "../../../../src/Background/Features/NetworkRules/BrowserRuleCompiler";
import { InMemoryRuleContext } from "../../../../src/Common/Rules/Context/InMemoryRuleContext";
import { RuleEnginePlanner } from "../../../../src/Common/Rules/Engine/RuleEnginePlanner";
import type { Rule } from "../../../../src/Contracts/Rules/Rule";
import { RuleTypeIds } from "../../../../src/Contracts/Rules/RuleTypeIds";
import { aRule } from "../../../TestData";

function headerRule(id: string, value: string): Rule {
    return aRule({
        id,
        name: id,
        type: RuleTypeIds.RequestHeader,
        criteria: {
            match: "all",
            items: [],
        },
        action: {
            operations: [
                {
                    op: "addOrUpdate",
                    name: "X-Tenant",
                    value,
                },
            ],
        },
    });
}

function plansOf(rules: Rule[]) {
    return RuleEnginePlanner.planAll(rules, new InMemoryRuleContext());
}

describe("BrowserRuleCompiler", () => {
    test("compile_WhenRulesRunInTheBrowser_ShouldRaisePriorityWithListOrder", () => {
        // Arrange
        const plans = plansOf([
            headerRule("first", "a"),
            headerRule("second", "b"),
        ]);

        // Act
        const ruleSet = BrowserRuleCompiler.compile(plans);

        // Assert
        expect(ruleSet.rules.map(compiled => [
            compiled.settingId,
            compiled.rule.id,
            compiled.rule.priority,
        ])).toEqual([
            [
                "first",
                1,
                BrowserRulePriorities.FirstRule,
            ],
            [
                "second",
                2,
                BrowserRulePriorities.FirstRule + 1,
            ],
        ]);
    });

    test("compile_WhenARuleIsInvalid_ShouldReportAFailureInsteadOfARule", () => {
        // Arrange
        const plans = plansOf([
            aRule({
                id: "broken",
                type: "teleport",
            }),
        ]);

        // Act
        const ruleSet = BrowserRuleCompiler.compile(plans);

        // Assert
        expect(ruleSet.rules).toEqual([]);
        expect(ruleSet.failures.map(failure => failure.settingId)).toEqual(["broken"]);
    });

    test("ownersOf_WhenRulesAreCompiled_ShouldMapEachDnrIdToItsRule", () => {
        // Arrange
        const ruleSet = BrowserRuleCompiler.compile(plansOf([headerRule("first", "a")]));

        // Act
        const owners = BrowserRuleCompiler.ownersOf(ruleSet.rules);

        // Assert
        expect(owners).toEqual([
            {
                dnrRuleId: 1,
                ruleId: "first",
            },
        ]);
    });
});
