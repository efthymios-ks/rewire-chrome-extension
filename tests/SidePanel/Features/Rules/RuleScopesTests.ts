import { describe, expect, test } from "vitest";
import { CriteriaMatches } from "../../../../src/Contracts/Rules/Criterion";
import { RuleEngine } from "../../../../src/Contracts/Rules/RuleEngine";
import { RuleScopes } from "../../../../src/SidePanel/Features/Rules/RuleScopes";
import { aCriterion, aProfile, aRule, aSettings, aSettingsWithRules } from "../../../TestData";

describe("RuleScopes", () => {
    test("criteriaSummary_WhenThereAreNoConditions_ShouldSayEveryRequest", () => {
        // Arrange
        const rule = aRule({
            criteria: {
                match: CriteriaMatches.All,
                items: [],
            },
        });

        // Act
        const summary = RuleScopes.criteriaSummary(rule);

        // Assert
        expect(summary).toBe("Every request");
    });

    test("criteriaSummary_WhenAnyConditionMatches_ShouldJoinWithOr", () => {
        // Arrange
        const rule = aRule({
            criteria: {
                match: CriteriaMatches.Any,
                items: [
                    aCriterion(),
                    aCriterion({
                        value: "*/orders*",
                    }),
                ],
            },
        });

        // Act
        const summary = RuleScopes.criteriaSummary(rule);

        // Assert
        expect(summary).toContain(" or ");
    });

    test("planOf_WhenTheRuleIsAMock_ShouldRunOnTheDebugger", () => {
        // Arrange
        const rule = aRule();

        // Act
        const plan = RuleScopes.planOf(rule);

        // Assert
        expect(plan.engine).toBe(RuleEngine.Debugger);
    });

    test("plansOf_WhenRulesAreDisabled_ShouldSkipThem", () => {
        // Arrange
        const settings = aSettingsWithRules([
            aRule({
                id: "on",
            }),
            aRule({
                id: "off",
                enabled: false,
            }),
        ]);

        // Act
        const plans = RuleScopes.plansOf(settings);

        // Assert
        expect(plans.map(plan => plan.rule.id)).toEqual(["on"]);
    });

    test("contextOf_WhenTheActiveProfileHasVariables_ShouldRenderThem", () => {
        // Arrange
        const settings = aSettings({
            profiles: [
                aProfile({
                    variables: [
                        {
                            name: "env",
                            value: "staging",
                        },
                    ],
                }),
            ],
        });

        // Act
        const rendered = RuleScopes.contextOf(settings).render("x-{{env}}-{{missing}}");

        // Assert
        expect(rendered).toBe("x-staging-{{missing}}");
    });
});
