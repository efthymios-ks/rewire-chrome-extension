import { describe, expect, test } from 'vitest';
import { InMemoryRuleContext } from '../Context/InMemoryRuleContext';
import { CRITERIA_OUTCOME } from '../Criteria/CriteriaOutcome';
import { RuleEnginePlanner } from './RuleEnginePlanner';
import type { RulePlan } from './RulePlan';
import { RuleTester } from './RuleTester';
import type { TesterInput } from './TesterInput';
import { TESTER_OUTCOME_KIND } from './TesterOutcomeKind';
import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import type { Rule } from '../../../Contracts/Rules/Rule';
import type { RuleAction } from '../../../Contracts/Rules/RuleAction';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';
import { aCriterion, aRule, aRuleContext, TEST_URLS } from '../../../TestData';

class SequenceRuleContext extends InMemoryRuleContext {
    rollCount = 0;

    private readonly _rolls: number[];

    constructor(rolls: number[]) {
        super();
        this._rolls = rolls;
    }

    override random(): number {
        const roll = this._rolls[this.rollCount % this._rolls.length] ?? 0;
        this.rollCount += 1;

        return roll;
    }
}

const HALF_SAMPLE = aCriterion({
    field: CRITERION_FIELD_IDS.Sample,
    op: CRITERION_OPERATOR_IDS.Percent,
    value: '50',
});

function anInput(overrides: Partial<TesterInput> = {}): TesterInput {
    return {
        url: TEST_URLS.UsersProfile,
        method: 'GET',
        headers: [],
        body: null,
        resourceType: 'Fetch',
        response: {
            status: 200,
            headers: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
            body: '{"id":42,"name":"Ada"}',
        },
        ...overrides,
    };
}

function planOf(overrides: Partial<Rule> = {}): RulePlan {
    return RuleEnginePlanner.plan(
        /* rule: */ aRule(overrides),
        /* context: */ aRuleContext(),
    );
}

function setHeader(name: string, value: string): RuleAction {
    return {
        operations: [
            {
                op: 'addOrUpdate',
                name,
                value,
            },
        ],
    };
}

describe('RuleTester', () => {
    test('testRule_WhenMockMatches_ShouldAnswerWithNoResponseSteps', () => {
        // Arrange
        const plan = planOf();

        // Act
        const report = RuleTester.testRule({
            plan,
            input: anInput(),
            context: aRuleContext(),
        });

        // Assert
        expect(report.requestEvaluation?.outcome).toBe(CRITERIA_OUTCOME.Matched);
        expect(report.responseStage?.steps).toEqual([]);
        expect(report.outcome).toEqual({
            kind: TESTER_OUTCOME_KIND.Answered,
            url: TEST_URLS.UsersProfile,
            response: {
                status: 200,
                headers: [
                    {
                        name: 'Content-Type',
                        value: 'application/json',
                    },
                ],
                body: '{"id":42}',
            },
        });
    });

    test('testRule_WhenNothingMatches_ShouldContinueWithTheInputResponse', () => {
        // Arrange
        const plan = planOf();
        const input = anInput({
            url: TEST_URLS.Orders,
        });

        // Act
        const report = RuleTester.testRule({
            plan,
            input,
            context: aRuleContext(),
        });

        // Assert
        expect(report.requestEvaluation?.outcome).toBe(CRITERIA_OUTCOME.NotMatched);
        expect(report.requestStage.steps).toEqual([]);
        expect(report.outcome).toEqual({
            kind: TESTER_OUTCOME_KIND.Continued,
            url: TEST_URLS.Orders,
            response: input.response,
        });
    });

    test('testRule_WhenInputHasNoResponse_ShouldContinueWithEmpty200', () => {
        // Arrange
        const plan = planOf();
        const input = anInput({
            url: TEST_URLS.Orders,
            response: null,
        });

        // Act
        const report = RuleTester.testRule({
            plan,
            input,
            context: aRuleContext(),
        });

        // Assert
        expect(report.outcome.response).toEqual({
            status: 200,
            headers: [],
            body: '',
        });
    });

    test('testRule_WhenRuleReadsTheResponse_ShouldDeferOnRequestAndApplyOnResponse', () => {
        // Arrange
        const plan = planOf({
            type: RULE_TYPE_IDS.MockResponse,
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion({
                        field: CRITERION_FIELD_IDS.ResponseStatus,
                        op: CRITERION_OPERATOR_IDS.Range,
                        value: '5xx',
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
                body: '',
            },
        });

        // Act
        const report = RuleTester.testRule({
            plan,
            input,
            context: aRuleContext(),
        });

        // Assert
        expect(report.requestEvaluation?.outcome).toBe(CRITERIA_OUTCOME.Deferred);
        expect(report.responseEvaluation?.outcome).toBe(CRITERIA_OUTCOME.Matched);
        expect(report.outcome.kind).toBe(TESTER_OUTCOME_KIND.Continued);
        expect(report.outcome.response?.status).toBe(200);
    });

    test('testRule_WhenPlanIsInvalid_ShouldEvaluateButApplyNothing', () => {
        // Arrange
        const plan = planOf({
            type: 'graphqlMock',
        });
        const input = anInput({
            method: 'post',
        });

        // Act
        const report = RuleTester.testRule({
            plan,
            input,
            context: aRuleContext(),
        });

        // Assert
        expect(report.requestEvaluation?.outcome).toBe(CRITERIA_OUTCOME.Matched);
        expect(report.requestStage.steps).toEqual([]);
        expect(report.requestStage.draft.method).toBe('POST');
        expect(report.outcome.kind).toBe(TESTER_OUTCOME_KIND.Continued);
    });

    test('testAll_WhenPlansSpanEngines_ShouldRunBrowserEntriesFirst', () => {
        // Arrange
        const debuggerPlan = planOf({
            id: 'debugger-header',
            type: RULE_TYPE_IDS.RequestHeader,
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion({
                        field: CRITERION_FIELD_IDS.RequestHeader,
                        op: CRITERION_OPERATOR_IDS.Exists,
                        name: 'X-Engine',
                    }),
                ],
            },
            action: setHeader('X-Engine', 'debugger'),
        });
        const latencyPlan = planOf({
            id: 'debugger-latency',
            type: RULE_TYPE_IDS.Delay,
            action: {
                delayMs: 250,
            },
        });
        const browserPlan = planOf({
            id: 'browser-header',
            type: RULE_TYPE_IDS.RequestHeader,
            action: setHeader('X-Engine', 'browser'),
        });
        const plans = [
            debuggerPlan,
            latencyPlan,
            browserPlan,
        ];

        // Act
        const report = RuleTester.testAll({
            plans,
            input: anInput(),
            context: aRuleContext(),
        });

        // Assert
        expect(report.requestEvaluation).toBeNull();
        expect(report.responseEvaluation).toBeNull();
        expect(report.requestStage.steps.map(step => step.plan.rule.id)).toEqual([
            'browser-header',
            'debugger-header',
            'debugger-latency',
        ]);
        expect(report.requestStage.draft.headers).toEqual([
            {
                name: 'X-Engine',
                value: 'debugger',
            },
        ]);
        expect(report.requestStage.delayMs).toBe(250);
    });

    test('testAll_WhenAMockAnswers_ShouldRunTheResponseRulesOnItsAnswerInListOrder', () => {
        // Arrange
        const plans = [
            planOf({
                id: 'mock',
            }),
            planOf({
                id: 'response-header',
                type: RULE_TYPE_IDS.ResponseHeader,
                action: {
                    operations: [
                        {
                            op: 'addOrUpdate',
                            name: 'X-Test',
                            value: '123',
                        },
                    ],
                },
            }),
        ];

        // Act
        const report = RuleTester.testAll({
            plans,
            input: anInput(),
            context: aRuleContext(),
        });

        // Assert
        expect(report.outcome.kind).toBe(TESTER_OUTCOME_KIND.Answered);
        expect(report.outcome.response?.headers).toContainEqual({
            name: 'X-Test',
            value: '123',
        });
        expect(report.responseStage?.steps.map(step => step.plan.rule.id)).toEqual(['response-header']);
    });

    test('testAll_WhenPlanRunsOnBothEngines_ShouldRunEachSideOnce', () => {
        // Arrange
        const plans = [
            planOf({
                id: 'cors',
                type: RULE_TYPE_IDS.Cors,
                action: {},
            }),
        ];

        // Act
        const report = RuleTester.testAll({
            plans,
            input: anInput(),
            context: aRuleContext(),
        });

        // Assert
        expect(report.requestStage.steps.map(step => step.plan.rule.id)).toEqual(['cors']);
        expect(report.responseStage?.steps.map(step => step.plan.rule.id)).toEqual(['cors']);
        expect(report.outcome.kind).toBe(TESTER_OUTCOME_KIND.Continued);
    });

    test('testRule_WhenASampleCriterionWouldRollDifferently_ShouldRollItOnceForTheWholeReport', () => {
        // Arrange
        const plan = planOf({
            type: RULE_TYPE_IDS.RequestHeader,
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [HALF_SAMPLE],
            },
            action: setHeader('X-Sampled', 'yes'),
        });
        const context = new SequenceRuleContext([
            0.1,
            0.9,
        ]);

        // Act
        const report = RuleTester.testRule({
            plan,
            input: anInput(),
            context,
        });

        // Assert
        expect(context.rollCount).toBe(1);
        expect(report.requestEvaluation?.outcome).toBe(CRITERIA_OUTCOME.Matched);
        expect(report.responseEvaluation?.outcome).toBe(CRITERIA_OUTCOME.Matched);
        expect(report.requestStage.steps).toHaveLength(1);
    });

    test('testAll_WhenTwoRulesSample_ShouldRollEachCriterionOnce', () => {
        // Arrange
        const plans = [
            planOf({
                id: 'sampled-1',
                type: RULE_TYPE_IDS.RequestHeader,
                criteria: {
                    match: CRITERIA_MATCHES.All,
                    items: [HALF_SAMPLE],
                },
                action: setHeader('X-First', 'yes'),
            }),
            planOf({
                id: 'sampled-2',
                type: RULE_TYPE_IDS.RequestHeader,
                criteria: {
                    match: CRITERIA_MATCHES.All,
                    items: [{ ...HALF_SAMPLE }],
                },
                action: setHeader('X-Second', 'yes'),
            }),
        ];
        const context = new SequenceRuleContext([
            0.1,
            0.9,
        ]);

        // Act
        const report = RuleTester.testAll({
            plans,
            input: anInput(),
            context,
        });

        // Assert
        expect(context.rollCount).toBe(2);
        expect(report.requestStage.steps.map(step => step.plan.rule.id)).toEqual(['sampled-1']);
    });
});
