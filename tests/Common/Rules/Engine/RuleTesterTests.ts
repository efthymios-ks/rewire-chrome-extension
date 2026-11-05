import { describe, expect, test } from "vitest";
import { CriteriaOutcome } from "../../../../src/Common/Rules/Criteria/CriteriaEvaluator";
import { RuleEnginePlanner } from "../../../../src/Common/Rules/Engine/RuleEnginePlanner";
import type { RulePlan } from "../../../../src/Common/Rules/Engine/RulePlan";
import { type TesterInput, TesterOutcomeKind, RuleTester } from "../../../../src/Common/Rules/Engine/RuleTester";
import { CriteriaMatches, CriterionFieldIds, CriterionOperatorIds } from "../../../../src/Contracts/Rules/Criterion";
import type { Rule, RuleAction } from "../../../../src/Contracts/Rules/Rule";
import { RuleTypeIds } from "../../../../src/Contracts/Rules/RuleTypeIds";
import { aCriterion, aRule, aRuleContext, TestUrls } from "../../../TestData";

function anInput(overrides: Partial<TesterInput> = {}): TesterInput {
    return {
        url: TestUrls.UsersProfile,
        method: "GET",
        headers: [],
        body: null,
        resourceType: "Fetch",
        response: {
            status: 200,
            headers: [
                {
                    name: "Content-Type",
                    value: "application/json",
                },
            ],
            body: "{\"id\":42,\"name\":\"Ada\"}",
        },
        ...overrides,
    };
}

function planOf(overrides: Partial<Rule> = {}): RulePlan {
    return RuleEnginePlanner.plan(aRule(overrides), aRuleContext());
}

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

describe("RuleTester", () => {
    test("testRule_WhenMockMatches_ShouldAnswerWithNoResponseSteps", () => {
        // Arrange
        const plan = planOf();

        // Act
        const report = RuleTester.testRule(
            plan,
            anInput(),
            aRuleContext()
        );

        // Assert
        expect(report.requestEvaluation?.outcome).toBe(CriteriaOutcome.Matched);
        expect(report.responseStage?.steps).toEqual([]);
        expect(report.outcome).toEqual({
            kind: TesterOutcomeKind.Answered,
            url: TestUrls.UsersProfile,
            response: {
                status: 200,
                headers: [
                    {
                        name: "Content-Type",
                        value: "application/json",
                    },
                ],
                body: "{\"id\":42}",
            },
        });
    });

    test("testRule_WhenNothingMatches_ShouldContinueWithTheInputResponse", () => {
        // Arrange
        const plan = planOf();
        const input = anInput({
            url: TestUrls.Orders,
        });

        // Act
        const report = RuleTester.testRule(
            plan,
            input,
            aRuleContext()
        );

        // Assert
        expect(report.requestEvaluation?.outcome).toBe(CriteriaOutcome.NotMatched);
        expect(report.requestStage.steps).toEqual([]);
        expect(report.outcome).toEqual({
            kind: TesterOutcomeKind.Continued,
            url: TestUrls.Orders,
            response: input.response,
        });
    });

    test("testRule_WhenInputHasNoResponse_ShouldContinueWithEmpty200", () => {
        // Arrange
        const plan = planOf();
        const input = anInput({
            url: TestUrls.Orders,
            response: null,
        });

        // Act
        const report = RuleTester.testRule(
            plan,
            input,
            aRuleContext()
        );

        // Assert
        expect(report.outcome.response).toEqual({
            status: 200,
            headers: [],
            body: "",
        });
    });

    test("testRule_WhenRuleReadsTheResponse_ShouldDeferOnRequestAndApplyOnResponse", () => {
        // Arrange
        const plan = planOf({
            type: RuleTypeIds.MockResponse,
            criteria: {
                match: CriteriaMatches.All,
                items: [
                    aCriterion({
                        field: CriterionFieldIds.ResponseStatus,
                        op: CriterionOperatorIds.Range,
                        value: "5xx",
                    }),
                ],
            },
            action: {
                overrideStatus: true,
                status: 200,
                overrideBody: false,
            },
        });
        const input = anInput({
            response: {
                status: 503,
                headers: [],
                body: "",
            },
        });

        // Act
        const report = RuleTester.testRule(
            plan,
            input,
            aRuleContext()
        );

        // Assert
        expect(report.requestEvaluation?.outcome).toBe(CriteriaOutcome.Deferred);
        expect(report.responseEvaluation?.outcome).toBe(CriteriaOutcome.Matched);
        expect(report.outcome.kind).toBe(TesterOutcomeKind.Continued);
        expect(report.outcome.response?.status).toBe(200);
    });

    test("testRule_WhenPlanIsInvalid_ShouldEvaluateButApplyNothing", () => {
        // Arrange
        const plan = planOf({
            type: "graphqlMock",
        });
        const input = anInput({
            method: "post",
        });

        // Act
        const report = RuleTester.testRule(
            plan,
            input,
            aRuleContext()
        );

        // Assert
        expect(report.requestEvaluation?.outcome).toBe(CriteriaOutcome.Matched);
        expect(report.requestStage.steps).toEqual([]);
        expect(report.requestStage.draft.method).toBe("POST");
        expect(report.outcome.kind).toBe(TesterOutcomeKind.Continued);
    });

    test("testAll_WhenPlansSpanEngines_ShouldRunBrowserEntriesFirst", () => {
        // Arrange
        const debuggerPlan = planOf({
            id: "debugger-header",
            type: RuleTypeIds.RequestHeader,
            criteria: {
                match: CriteriaMatches.All,
                items: [
                    aCriterion({
                        field: CriterionFieldIds.RequestHeader,
                        op: CriterionOperatorIds.Exists,
                        name: "X-Engine",
                    }),
                ],
            },
            action: setHeader("X-Engine", "debugger"),
        });
        const latencyPlan = planOf({
            id: "debugger-latency",
            type: RuleTypeIds.Delay,
            action: {
                delayMs: 250,
            },
        });
        const browserPlan = planOf({
            id: "browser-header",
            type: RuleTypeIds.RequestHeader,
            action: setHeader("X-Engine", "browser"),
        });
        const plans = [
            debuggerPlan,
            latencyPlan,
            browserPlan,
        ];

        // Act
        const report = RuleTester.testAll(
            plans,
            anInput(),
            aRuleContext()
        );

        // Assert
        expect(report.requestEvaluation).toBeNull();
        expect(report.responseEvaluation).toBeNull();
        expect(report.requestStage.steps.map(step => step.plan.rule.id)).toEqual([
            "browser-header",
            "debugger-header",
            "debugger-latency",
        ]);
        expect(report.requestStage.draft.headers).toEqual([
            {
                name: "X-Engine",
                value: "debugger",
            },
        ]);
        expect(report.requestStage.delayMs).toBe(250);
    });

    test("testAll_WhenAMockAnswers_ShouldRunTheResponseRulesOnItsAnswerInListOrder", () => {
        // Arrange
        const plans = [
            planOf({
                id: "mock",
            }),
            planOf({
                id: "response-header",
                type: RuleTypeIds.ResponseHeader,
                action: {
                    operations: [
                        {
                            op: "addOrUpdate",
                            name: "X-Test",
                            value: "123",
                        },
                    ],
                },
            }),
        ];

        // Act
        const report = RuleTester.testAll(
            plans,
            anInput(),
            aRuleContext()
        );

        // Assert
        expect(report.outcome.kind).toBe(TesterOutcomeKind.Answered);
        expect(report.outcome.response?.headers).toContainEqual({
            name: "X-Test",
            value: "123",
        });
        expect(report.responseStage?.steps.map(step => step.plan.rule.id)).toEqual(["response-header"]);
    });

    test("testAll_WhenPlanRunsOnBothEngines_ShouldRunEachSideOnce", () => {
        // Arrange
        const plans = [
            planOf({
                id: "cors",
                type: RuleTypeIds.Cors,
                action: {},
            }),
        ];

        // Act
        const report = RuleTester.testAll(
            plans,
            anInput(),
            aRuleContext()
        );

        // Assert
        expect(report.requestStage.steps.map(step => step.plan.rule.id)).toEqual(["cors"]);
        expect(report.responseStage?.steps.map(step => step.plan.rule.id)).toEqual(["cors"]);
        expect(report.outcome.kind).toBe(TesterOutcomeKind.Continued);
    });
});
