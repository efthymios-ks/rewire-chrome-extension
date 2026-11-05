import { describe, expect, test } from "vitest";
import { PlannerReasons, RuleEnginePlanner } from "../../../../src/Common/Rules/Engine/RuleEnginePlanner";
import { CriteriaMatches, CriterionFieldIds, CriterionOperatorIds } from "../../../../src/Contracts/Rules/Criterion";
import type { RuleAction } from "../../../../src/Contracts/Rules/Rule";
import { RuleEngine } from "../../../../src/Contracts/Rules/RuleEngine";
import { RuleTypeIds } from "../../../../src/Contracts/Rules/RuleTypeIds";
import { FixedRuleContext } from "../../../FixedRuleContext";
import { aCriterion, aRule, aRuleContext } from "../../../TestData";

const UsersRegex = "^.*/api/v1/users/.*$";

const OfficeHours = aCriterion({
    field: CriterionFieldIds.TimeWindow,
    op: CriterionOperatorIds.Between,
    value: "09:00-17:00",
});

const BeforeOffice = new FixedRuleContext(new Date("2026-11-06T08:00:00"));

const ServerErrorStatus = aCriterion({
    field: CriterionFieldIds.ResponseStatus,
    op: CriterionOperatorIds.Range,
    value: "5xx",
});

function setHeader(name: string, value: string): RuleAction {
    return {
        operations: [
            {
                op: "addOrUpdate",
                name,
                value,
            },
        ],
    };
}

describe("RuleEnginePlanner", () => {
    test("plan_WhenTypeIsUnknown_ShouldBeInvalid", () => {
        // Arrange
        const rule = aRule({
            type: "graphqlMock",
        });

        // Act
        const plan = RuleEnginePlanner.plan(rule, aRuleContext());

        // Assert
        expect(plan.engine).toBe(RuleEngine.Invalid);
        expect(plan.type).toBeNull();
        expect(plan.errors).toEqual([PlannerReasons.UnknownType]);
        expect(plan.reason).toBe(PlannerReasons.UnknownType);
    });

    test("plan_WhenCriteriaAndActionAreInvalid_ShouldBeInvalidWithFirstErrorAsReason", () => {
        // Arrange
        const rule = aRule({
            criteria: {
                match: CriteriaMatches.All,
                items: [
                    aCriterion({
                        value: "",
                    }),
                ],
            },
            action: {
                status: 999,
            },
        });

        // Act
        const plan = RuleEnginePlanner.plan(rule, aRuleContext());

        // Assert
        expect(plan.engine).toBe(RuleEngine.Invalid);
        expect(plan.errors).toEqual([
            "URL needs a value.",
            "Status must be a whole number from 100 to 599.",
        ]);
        expect(plan.reason).toBe("URL needs a value.");
    });

    test("plan_WhenRequestOnlyTypeHasResponseCriteria_ShouldBeInvalid", () => {
        // Arrange
        const rule = aRule({
            type: RuleTypeIds.RequestHeader,
            action: setHeader("X-Env", "staging"),
            criteria: {
                match: CriteriaMatches.All,
                items: [
                    aCriterion(),
                    ServerErrorStatus,
                ],
            },
        });

        // Act
        const plan = RuleEnginePlanner.plan(rule, aRuleContext());

        // Assert
        expect(plan.engine).toBe(RuleEngine.Invalid);
        expect(plan.errors).toEqual([PlannerReasons.ResponseCriteriaTooLate]);
        expect(plan.reason).toBe(PlannerReasons.ResponseCriteriaTooLate);
    });

    test("plan_WhenResponseTypeHasResponseCriteria_ShouldUseDebuggerWithCompileReason", () => {
        // Arrange
        const rule = aRule({
            type: RuleTypeIds.MockResponse,
            criteria: {
                match: CriteriaMatches.All,
                items: [ServerErrorStatus],
            },
            action: {
                overrideStatus: true,
                status: 200,
                overrideBody: false,
            },
        });

        // Act
        const plan = RuleEnginePlanner.plan(rule, aRuleContext());

        // Assert
        expect(plan.engine).toBe(RuleEngine.Debugger);
        expect(plan.errors).toEqual([]);
        expect(plan.reason).toBe("Response status conditions work on the inspected tab only.");
    });

    test("plan_WhenRuleIsLatency_ShouldRunOnTheInspectedTabWithItsDelay", () => {
        // Arrange
        const rule = aRule({
            type: RuleTypeIds.Delay,
            action: {
                delayMs: 1500,
            },
        });

        // Act
        const plan = RuleEnginePlanner.plan(rule, aRuleContext());

        // Assert
        expect(plan.engine).toBe(RuleEngine.Debugger);
        expect(plan.reason).toBe(PlannerReasons.TypeNeedsDebugger);
        expect(plan.delayMs).toBe(1500);
        expect(plan.browserRules).toEqual([]);
    });

    test("plan_WhenAnotherTypeCarriesAnOldDelay_ShouldIgnoreIt", () => {
        // Arrange
        const rule = aRule({
            type: RuleTypeIds.RequestHeader,
            action: {
                ...setHeader("X-Env", "staging"),
                delayMs: 1500,
            },
        });

        // Act
        const plan = RuleEnginePlanner.plan(rule, aRuleContext());

        // Assert
        expect(plan.engine).toBe(RuleEngine.Browser);
        expect(plan.delayMs).toBe(0);
    });

    test("plan_WhenTypeCompilesForBrowser_ShouldRunInBrowserWithDefaultResourceTypes", () => {
        // Arrange
        const rule = aRule({
            type: RuleTypeIds.RequestHeader,
            action: setHeader("X-Env", "staging"),
        });

        // Act
        const plan = RuleEnginePlanner.plan(rule, aRuleContext());

        // Assert
        expect(plan.engine).toBe(RuleEngine.Browser);
        expect(plan.reason).toBe(PlannerReasons.RunsInBrowser);
        expect(plan.isStaticallyActive).toBe(true);
        expect(plan.browserRules).toEqual([
            {
                action: {
                    type: "modifyHeaders",
                    requestHeaders: [
                        {
                            header: "X-Env",
                            operation: "set",
                            value: "staging",
                        },
                    ],
                },
                condition: {
                    regexFilter: UsersRegex,
                    resourceTypes: [
                        "xmlhttprequest",
                        "other",
                        "main_frame",
                        "sub_frame",
                    ],
                },
            },
        ]);
    });

    test.each([
        [
            false,
            {
                regexFilter: UsersRegex,
                resourceTypes: ["script"],
            },
        ],
        [
            true,
            {
                regexFilter: UsersRegex,
                excludedResourceTypes: ["script"],
            },
        ],
    ])("plan_WhenCriteriaNameResourceTypesAndNegateIs(%s)_ShouldKeepThemInsteadOfDefaults", (isNegated, expectedCondition) => {
        // Arrange
        const rule = aRule({
            type: RuleTypeIds.RequestHeader,
            criteria: {
                match: CriteriaMatches.All,
                items: [
                    aCriterion(),
                    aCriterion({
                        field: CriterionFieldIds.ResourceType,
                        op: CriterionOperatorIds.OneOf,
                        value: "script",
                        negate: isNegated,
                    }),
                ],
            },
            action: setHeader("X-Env", "staging"),
        });

        // Act
        const plan = RuleEnginePlanner.plan(rule, aRuleContext());

        // Assert
        expect(plan.browserRules.map(browserRule => browserRule.condition)).toEqual([expectedCondition]);
    });

    test("plan_WhenMatchAnyHasSeveralRegexItems_ShouldEmitOneBrowserRulePerItem", () => {
        // Arrange
        const rule = aRule({
            type: RuleTypeIds.RequestHeader,
            criteria: {
                match: CriteriaMatches.Any,
                items: [
                    aCriterion(),
                    aCriterion({
                        field: CriterionFieldIds.Extension,
                        op: CriterionOperatorIds.OneOf,
                        value: "json",
                    }),
                ],
            },
            action: setHeader("X-Env", "staging"),
        });

        // Act
        const plan = RuleEnginePlanner.plan(rule, aRuleContext());

        // Assert
        expect(plan.engine).toBe(RuleEngine.Browser);
        expect(plan.browserRules).toHaveLength(2);
        expect(plan.browserRules.map(browserRule => browserRule.condition.resourceTypes)).toEqual([
            [
                "xmlhttprequest",
                "other",
                "main_frame",
                "sub_frame",
            ],
            [
                "xmlhttprequest",
                "other",
                "main_frame",
                "sub_frame",
            ],
        ]);
    });

    test("plan_WhenTypeRunsOnBothEngines_ShouldPlanBoth", () => {
        // Arrange
        const rule = aRule({
            type: RuleTypeIds.Cors,
            action: {},
        });

        // Act
        const plan = RuleEnginePlanner.plan(rule, aRuleContext());

        // Assert
        expect(plan.engine).toBe(RuleEngine.Both);
        expect(plan.reason).toBe(PlannerReasons.RunsOnBoth);
        expect(plan.browserRules).toHaveLength(1);
    });

    test("plan_WhenCriteriaCannotCompileForBrowser_ShouldUseDebuggerWithCompileReason", () => {
        // Arrange
        const rule = aRule({
            type: RuleTypeIds.RequestHeader,
            criteria: {
                match: CriteriaMatches.All,
                items: [
                    aCriterion({
                        field: CriterionFieldIds.RequestHeader,
                        op: CriterionOperatorIds.Exists,
                        name: "Authorization",
                    }),
                ],
            },
            action: setHeader("X-Env", "staging"),
        });

        // Act
        const plan = RuleEnginePlanner.plan(rule, aRuleContext());

        // Assert
        expect(plan.engine).toBe(RuleEngine.Debugger);
        expect(plan.reason).toBe("Request header conditions work on the inspected tab only.");
        expect(plan.errors).toEqual([]);
    });

    test("plan_WhenTypeHasNoBrowserForm_ShouldUseDebugger", () => {
        // Arrange
        const rule = aRule();

        // Act
        const plan = RuleEnginePlanner.plan(rule, aRuleContext());

        // Assert
        expect(plan.engine).toBe(RuleEngine.Debugger);
        expect(plan.reason).toBe(PlannerReasons.TypeNeedsDebugger);
        expect(plan.delayMs).toBe(0);
    });

    test("plan_WhenStaticCriteriaFail_ShouldMarkRuleStaticallyInactiveWithoutBrowserRules", () => {
        // Arrange
        const rule = aRule({
            type: RuleTypeIds.RequestHeader,
            criteria: {
                match: CriteriaMatches.All,
                items: [
                    aCriterion(),
                    OfficeHours,
                ],
            },
            action: setHeader("X-Env", "staging"),
        });

        // Act
        const plan = RuleEnginePlanner.plan(rule, BeforeOffice);

        // Assert
        expect(plan.engine).toBe(RuleEngine.Browser);
        expect(plan.isStaticallyActive).toBe(false);
        expect(plan.browserRules).toEqual([]);
    });

    test("plan_WhenStaticCriteriaFailForDebuggerOnlyType_ShouldStillPlanDebugger", () => {
        // Arrange
        const rule = aRule({
            criteria: {
                match: CriteriaMatches.All,
                items: [
                    aCriterion(),
                    OfficeHours,
                ],
            },
        });

        // Act
        const plan = RuleEnginePlanner.plan(rule, BeforeOffice);

        // Assert
        expect(plan.engine).toBe(RuleEngine.Debugger);
        expect(plan.reason).toBe(PlannerReasons.TypeNeedsDebugger);
        expect(plan.isStaticallyActive).toBe(false);
    });

    test("planAll_WhenRulesAreGiven_ShouldPlanEachInOrder", () => {
        // Arrange
        const rules = [
            aRule({
                id: "mock",
            }),
            aRule({
                id: "unknown",
                type: "graphqlMock",
            }),
        ];

        // Act
        const plans = RuleEnginePlanner.planAll(rules, aRuleContext());

        // Assert
        expect(plans.map(plan => plan.rule.id)).toEqual([
            "mock",
            "unknown",
        ]);
        expect(plans.map(plan => plan.engine)).toEqual([
            RuleEngine.Debugger,
            RuleEngine.Invalid,
        ]);
    });
});
