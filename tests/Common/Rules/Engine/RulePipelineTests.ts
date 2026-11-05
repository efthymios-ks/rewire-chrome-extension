import { describe, expect, test } from "vitest";
import type { RequestDraft } from "../../../../src/Common/Rules/Drafts/Drafts";
import { RuleEnginePlanner } from "../../../../src/Common/Rules/Engine/RuleEnginePlanner";
import { PipelineEntries, type PipelineEntry, RulePipeline } from "../../../../src/Common/Rules/Engine/RulePipeline";
import type { RulePlan } from "../../../../src/Common/Rules/Engine/RulePlan";
import { CriteriaMatches, type Criterion, CriterionFieldIds, CriterionOperatorIds } from "../../../../src/Contracts/Rules/Criterion";
import type { Rule, RuleAction } from "../../../../src/Contracts/Rules/Rule";
import { RuleTypeIds } from "../../../../src/Contracts/Rules/RuleTypeIds";
import { ChangeArea } from "../../../../src/Contracts/Rules/ValueChange";
import { aCriterion, aRequestDraft, aResponseDraft, aRule, aRuleContext, TestUrls } from "../../../TestData";

const OverriddenStatus = 502;

const ServerErrorStatus = aCriterion({
    field: CriterionFieldIds.ResponseStatus,
    op: CriterionOperatorIds.Range,
    value: "5xx",
});

function planOf(overrides: Partial<Rule>): RulePlan {
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

function criteriaOf(criterion: Criterion): Rule["criteria"] {
    return {
        match: CriteriaMatches.All,
        items: [criterion],
    };
}

function headerRule(id: string, action: RuleAction): RulePlan {
    return planOf({
        id,
        type: RuleTypeIds.RequestHeader,
        action,
    });
}

function statusRule(id: string, criterion: Criterion): RulePlan {
    return planOf({
        id,
        type: RuleTypeIds.MockResponse,
        criteria: criteriaOf(criterion),
        action: {
            overrideStatus: true,
            status: OverriddenStatus,
            overrideBody: false,
        },
    });
}

function wholeRules(plans: RulePlan[]): PipelineEntry[] {
    return plans.flatMap(plan => PipelineEntries.forWholeRule(plan));
}

interface EntryShape {
    id: string;
    runsRequest: boolean;
    runsResponse: boolean;
}

function shapeOf(entries: PipelineEntry[]): EntryShape[] {
    return entries.map(entry => ({
        id: entry.plan.rule.id,
        runsRequest: entry.runsRequest,
        runsResponse: entry.runsResponse,
    }));
}

function mixedPlans(): RulePlan[] {
    return [
        headerRule("browser-header", setHeader("X-Env", "staging")),
        planOf({
            id: "debugger-mock",
        }),
        planOf({
            id: "both-cors",
            type: RuleTypeIds.Cors,
            action: {},
        }),
        planOf({
            id: "invalid-unknown",
            type: "graphqlMock",
        }),
        statusRule("debugger-status", aCriterion()),
    ];
}

describe("RulePipeline", () => {
    test("forDebugger_WhenPlansMixEngines_ShouldKeepDebuggerPlansAndRequestSideOfBoth", () => {
        // Arrange
        const plans = mixedPlans();

        // Act
        const entries = PipelineEntries.forDebugger(plans);

        // Assert
        expect(shapeOf(entries)).toEqual([
            {
                id: "debugger-mock",
                runsRequest: true,
                runsResponse: false,
            },
            {
                id: "both-cors",
                runsRequest: true,
                runsResponse: false,
            },
            {
                id: "debugger-status",
                runsRequest: false,
                runsResponse: true,
            },
        ]);
    });

    test("forBrowser_WhenPlansMixEngines_ShouldKeepBrowserPlansAndResponseSideOfBoth", () => {
        // Arrange
        const plans = mixedPlans();

        // Act
        const entries = PipelineEntries.forBrowser(plans);

        // Assert
        expect(shapeOf(entries)).toEqual([
            {
                id: "browser-header",
                runsRequest: true,
                runsResponse: false,
            },
            {
                id: "both-cors",
                runsRequest: false,
                runsResponse: true,
            },
        ]);
    });

    test("forWholeRule_WhenPlanIsValidOrInvalid_ShouldRunEverySideTheTypeHandlesOrNothing", () => {
        // Arrange
        const corsPlan = planOf({
            id: "both-cors",
            type: RuleTypeIds.Cors,
            action: {},
        });
        const invalidPlan = planOf({
            type: "graphqlMock",
        });

        // Act
        const corsEntries = PipelineEntries.forWholeRule(corsPlan);
        const invalidEntries = PipelineEntries.forWholeRule(invalidPlan);

        // Assert
        expect(shapeOf(corsEntries)).toEqual([
            {
                id: "both-cors",
                runsRequest: true,
                runsResponse: true,
            },
        ]);
        expect(invalidEntries).toEqual([]);
    });

    test("runRequest_WhenRulesRunInOrder_ShouldLetLaterRulesSeeEarlierChanges", () => {
        // Arrange
        const tagger = headerRule("tagger", setHeader("X-Env", "staging"));
        const follower = planOf({
            id: "follower",
            type: RuleTypeIds.RequestHeader,
            criteria: criteriaOf(aCriterion({
                field: CriterionFieldIds.RequestHeader,
                op: CriterionOperatorIds.Wildcard,
                name: "x-env",
                value: "staging",
            })),
            action: setHeader("X-Seen", "1"),
        });
        const context = aRuleContext();

        // Act
        const inOrder = RulePipeline.runRequest(
            wholeRules([
                tagger,
                follower,
            ]),
            aRequestDraft(),
            context
        );
        const reversed = RulePipeline.runRequest(
            wholeRules([
                follower,
                tagger,
            ]),
            aRequestDraft(),
            context
        );

        // Assert
        expect(inOrder.steps.map(step => step.plan.rule.id)).toEqual([
            "tagger",
            "follower",
        ]);
        expect(inOrder.steps[1]?.changes).toEqual([
            {
                area: ChangeArea.RequestHeader,
                name: "x-seen",
                before: null,
                after: "1",
            },
        ]);
        expect(reversed.steps.map(step => step.plan.rule.id)).toEqual(["tagger"]);
    });

    test("runRequest_WhenSeveralMatchedRulesDelay_ShouldUseTheLongestDelay", () => {
        // Arrange
        const plans = [
            planOf({
                id: "short",
                type: RuleTypeIds.Delay,
                action: {
                    delayMs: 300,
                },
            }),
            planOf({
                id: "long",
                type: RuleTypeIds.Delay,
                action: {
                    delayMs: 1200,
                },
            }),
            planOf({
                id: "unmatched",
                type: RuleTypeIds.Delay,
                criteria: criteriaOf(aCriterion({
                    value: "*/api/v1/orders*",
                })),
                action: {
                    delayMs: 5000,
                },
            }),
        ];

        // Act
        const result = RulePipeline.runRequest(
            wholeRules(plans),
            aRequestDraft(),
            aRuleContext()
        );

        // Assert
        expect(result.delayMs).toBe(1200);
        expect(result.steps.map(step => step.changes)).toEqual([
            [],
            [],
        ]);
    });

    test("runRequest_WhenResponseRulesAreSeen_ShouldCollectPreMatchedAndDeferredCandidates", () => {
        // Arrange
        const plans = [
            statusRule("pre-matched", aCriterion()),
            statusRule("deferred", ServerErrorStatus),
            statusRule("unmatched", aCriterion({ value: "*/orders*" })),
        ];

        // Act
        const result = RulePipeline.runRequest(
            wholeRules(plans),
            aRequestDraft(),
            aRuleContext()
        );

        // Assert
        expect(result.responseCandidates.map(candidate => [
            candidate.entry.plan.rule.id,
            candidate.isPreMatched,
        ])).toEqual([
            [
                "pre-matched",
                true,
            ],
            [
                "deferred",
                false,
            ],
        ]);
        expect(result.steps).toEqual([]);
        expect(result.draft).toEqual(aRequestDraft());
    });

    test("runRequest_WhenRequestIsOutsideDefaultScope_ShouldRunOnlyRulesThatNameItsType", () => {
        // Arrange
        const untyped = headerRule("untyped", setHeader("X-Untyped", "1"));
        const typed = planOf({
            id: "typed",
            type: RuleTypeIds.RequestHeader,
            criteria: {
                match: CriteriaMatches.All,
                items: [
                    aCriterion(),
                    aCriterion({
                        field: CriterionFieldIds.ResourceType,
                        op: CriterionOperatorIds.OneOf,
                        value: "script",
                    }),
                ],
            },
            action: setHeader("X-Typed", "1"),
        });
        const draft = aRequestDraft({
            resourceType: "Script",
        });

        // Act
        const result = RulePipeline.runRequest(
            wholeRules([
                untyped,
                typed,
            ]),
            draft,
            aRuleContext()
        );

        // Assert
        expect(result.steps.map(step => step.plan.rule.id)).toEqual(["typed"]);
    });

    test("runResponse_WhenCandidateIsDeferred_ShouldReevaluateAgainstTheResponse", () => {
        // Arrange
        const candidates = RulePipeline.runRequest(
            wholeRules([statusRule("deferred", ServerErrorStatus)]),
            aRequestDraft(),
            aRuleContext()
        ).responseCandidates;

        // Act
        const failing = RulePipeline.runResponse(
            candidates,
            aRequestDraft(),
            aResponseDraft({
                status: 503,
            }),
            aRuleContext()
        );
        const missing = RulePipeline.runResponse(
            candidates,
            aRequestDraft(),
            aResponseDraft({
                status: 404,
            }),
            aRuleContext()
        );

        // Assert
        expect(failing.draft.status).toBe(OverriddenStatus);
        expect(failing.steps[0]?.changes).toEqual([
            {
                area: ChangeArea.Status,
                name: "status",
                before: "503",
                after: String(OverriddenStatus),
            },
        ]);
        expect(missing.draft.status).toBe(404);
        expect(missing.steps).toEqual([]);
    });

    test("runResponse_WhenCandidateIsPreMatched_ShouldApplyWithoutReevaluating", () => {
        // Arrange
        const plan = statusRule("pre-matched", aCriterion());
        const candidates = [
            {
                entry: PipelineEntries.forWholeRule(plan)[0]!,
                isPreMatched: true,
            },
        ];
        const otherRequest = aRequestDraft({
            url: TestUrls.Orders,
        });

        // Act
        const result = RulePipeline.runResponse(
            candidates,
            otherRequest,
            aResponseDraft(),
            aRuleContext()
        );

        // Assert
        expect(result.draft.status).toBe(OverriddenStatus);
    });

    test("runResponse_WhenCandidatesChain_ShouldLetLaterRulesSeeEarlierChanges", () => {
        // Arrange
        const breaker = statusRule("breaker", aCriterion());
        const tagger = planOf({
            id: "tagger",
            type: RuleTypeIds.ResponseHeader,
            criteria: criteriaOf(ServerErrorStatus),
            action: setHeader("X-Failed", "yes"),
        });
        const candidates = RulePipeline.runRequest(
            wholeRules([
                breaker,
                tagger,
            ]),
            aRequestDraft(),
            aRuleContext()
        ).responseCandidates;

        // Act
        const result = RulePipeline.runResponse(
            candidates,
            aRequestDraft(),
            aResponseDraft(),
            aRuleContext()
        );

        // Assert
        expect(result.steps.map(step => step.plan.rule.id)).toEqual([
            "breaker",
            "tagger",
        ]);
        expect(result.draft.headers).toContainEqual({
            name: "X-Failed",
            value: "yes",
        });
    });

    test("runResponse_WhenPlanHasNoType_ShouldSkipIt", () => {
        // Arrange
        const plan = planOf({
            type: "graphqlMock",
        });
        const candidates = [
            {
                entry: {
                    plan,
                    runsRequest: false,
                    runsResponse: true,
                },
                isPreMatched: true,
            },
        ];

        // Act
        const result = RulePipeline.runResponse(
            candidates,
            aRequestDraft(),
            aResponseDraft(),
            aRuleContext()
        );

        // Assert
        expect(result.steps).toEqual([]);
        expect(result.draft).toEqual(aResponseDraft());
    });

    test.each([
        [
            "NothingIsSet",
            aRequestDraft(),
            false,
        ],
        [
            "ResponseIsSet",
            aRequestDraft({
                response: {
                    status: 204,
                    headers: [],
                    body: "",
                },
            }),
            true,
        ],
    ])("isTerminal_When%s_ShouldReturn(%s)", (
        _case,
        draft: RequestDraft,
        expected
    ) => {
        // Arrange
        const request = draft;

        // Act
        const isTerminal = RulePipeline.isTerminal(request);

        // Assert
        expect(isTerminal).toBe(expected);
    });
});
