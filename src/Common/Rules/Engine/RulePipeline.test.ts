import { describe, expect, test } from 'vitest';
import { PipelineEntries } from './PipelineEntries';
import type { PipelineEntry } from './PipelineEntry';
import { RuleEnginePlanner } from './RuleEnginePlanner';
import { RulePipeline } from './RulePipeline';
import type { RulePlan } from './RulePlan';
import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import type { Criterion } from '../../../Contracts/Rules/Criterion';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import type { Rule } from '../../../Contracts/Rules/Rule';
import type { RuleAction } from '../../../Contracts/Rules/RuleAction';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';
import { aCriterion, aRequestDraft, aResponseDraft, aRule, aRuleContext, criteriaOf, TEST_URLS } from '../../../TestData';

const OVERRIDDEN_STATUS = 502;

const SERVER_ERROR_STATUS = aCriterion({
    field: CRITERION_FIELD_IDS.ResponseStatus,
    op: CRITERION_OPERATOR_IDS.Range,
    value: '5xx',
});

function planOf(overrides: Partial<Rule>): RulePlan {
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

function headerRule(id: string, action: RuleAction): RulePlan {
    return planOf({
        id,
        type: RULE_TYPE_IDS.RequestHeader,
        action,
    });
}

function statusRule(id: string, criterion: Criterion): RulePlan {
    return planOf({
        id,
        type: RULE_TYPE_IDS.MockResponse,
        criteria: criteriaOf(criterion),
        action: {
            overrideStatus: true,
            status: OVERRIDDEN_STATUS,
            overrideBody: false,
        },
    });
}

function wholeRules(plans: RulePlan[]): PipelineEntry[] {
    return plans.flatMap(plan => PipelineEntries.forWholeRule(plan));
}

describe('RulePipeline', () => {
    test('runRequest_WhenRulesRunInOrder_ShouldLetLaterRulesSeeEarlierChanges', () => {
        // Arrange
        const tagger = headerRule(
            /* id: */ 'tagger',
            /* action: */ setHeader('X-Env', 'staging'),
        );
        const follower = planOf({
            id: 'follower',
            type: RULE_TYPE_IDS.RequestHeader,
            criteria: criteriaOf(aCriterion({
                field: CRITERION_FIELD_IDS.RequestHeader,
                op: CRITERION_OPERATOR_IDS.Wildcard,
                name: 'x-env',
                value: 'staging',
            })),
            action: setHeader('X-Seen', '1'),
        });
        const context = aRuleContext();

        // Act
        const inOrder = RulePipeline.runRequest({
            entries: wholeRules([
                tagger,
                follower,
            ]),
            draft: aRequestDraft(),
            context,
        });
        const reversed = RulePipeline.runRequest({
            entries: wholeRules([
                follower,
                tagger,
            ]),
            draft: aRequestDraft(),
            context,
        });

        // Assert
        expect(inOrder.steps.map(step => step.plan.rule.id)).toEqual([
            'tagger',
            'follower',
        ]);
        expect(inOrder.steps[1]?.changes).toEqual([
            {
                area: CHANGE_AREA.RequestHeader,
                name: 'x-seen',
                before: null,
                after: '1',
            },
        ]);
        expect(reversed.steps.map(step => step.plan.rule.id)).toEqual(['tagger']);
    });

    test('runRequest_WhenSeveralMatchedRulesDelay_ShouldUseTheLongestDelay', () => {
        // Arrange
        const plans = [
            planOf({
                id: 'short',
                type: RULE_TYPE_IDS.Delay,
                action: {
                    delayMs: 300,
                },
            }),
            planOf({
                id: 'long',
                type: RULE_TYPE_IDS.Delay,
                action: {
                    delayMs: 1200,
                },
            }),
            planOf({
                id: 'unmatched',
                type: RULE_TYPE_IDS.Delay,
                criteria: criteriaOf(aCriterion({
                    value: '*/api/v1/orders*',
                })),
                action: {
                    delayMs: 5000,
                },
            }),
        ];

        // Act
        const result = RulePipeline.runRequest({
            entries: wholeRules(plans),
            draft: aRequestDraft(),
            context: aRuleContext(),
        });

        // Assert
        expect(result.delayMs).toBe(1200);
        expect(result.steps.map(step => step.changes)).toEqual([
            [],
            [],
        ]);
    });

    test('runRequest_WhenResponseRulesAreSeen_ShouldCollectPreMatchedAndDeferredCandidates', () => {
        // Arrange
        const plans = [
            statusRule(
                /* id: */ 'pre-matched',
                /* criterion: */ aCriterion(),
            ),
            statusRule('deferred', SERVER_ERROR_STATUS),
            statusRule(
                /* id: */ 'unmatched',
                /* criterion: */ aCriterion({ value: '*/orders*' }),
            ),
        ];

        // Act
        const result = RulePipeline.runRequest({
            entries: wholeRules(plans),
            draft: aRequestDraft(),
            context: aRuleContext(),
        });

        // Assert
        expect(result.responseCandidates.map(candidate => [
            candidate.entry.plan.rule.id,
            candidate.isPreMatched,
        ])).toEqual([
            [
                'pre-matched',
                true,
            ],
            [
                'deferred',
                false,
            ],
        ]);
        expect(result.steps).toEqual([]);
        expect(result.draft).toEqual(aRequestDraft());
    });

    test('runRequest_WhenRequestIsOutsideDefaultScope_ShouldRunOnlyRulesThatNameItsType', () => {
        // Arrange
        const untyped = headerRule(
            /* id: */ 'untyped',
            /* action: */ setHeader('X-Untyped', '1'),
        );
        const typed = planOf({
            id: 'typed',
            type: RULE_TYPE_IDS.RequestHeader,
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion(),
                    aCriterion({
                        field: CRITERION_FIELD_IDS.ResourceType,
                        op: CRITERION_OPERATOR_IDS.OneOf,
                        value: 'script',
                    }),
                ],
            },
            action: setHeader('X-Typed', '1'),
        });
        const draft = aRequestDraft({
            resourceType: 'Script',
        });

        // Act
        const result = RulePipeline.runRequest({
            entries: wholeRules([
                untyped,
                typed,
            ]),
            draft,
            context: aRuleContext(),
        });

        // Assert
        expect(result.steps.map(step => step.plan.rule.id)).toEqual(['typed']);
    });

    test('runResponse_WhenCandidateIsDeferred_ShouldReevaluateAgainstTheResponse', () => {
        // Arrange
        const candidates = RulePipeline.runRequest({
            entries: wholeRules([statusRule('deferred', SERVER_ERROR_STATUS)]),
            draft: aRequestDraft(),
            context: aRuleContext(),
        }).responseCandidates;

        // Act
        const failing = RulePipeline.runResponse({
            candidates,
            request: aRequestDraft(),
            response: aResponseDraft({
                status: 503,
            }),
            context: aRuleContext(),
        });
        const missing = RulePipeline.runResponse({
            candidates,
            request: aRequestDraft(),
            response: aResponseDraft({
                status: 404,
            }),
            context: aRuleContext(),
        });

        // Assert
        expect(failing.draft.status).toBe(OVERRIDDEN_STATUS);
        expect(failing.steps[0]?.changes).toEqual([
            {
                area: CHANGE_AREA.Status,
                name: 'status',
                before: '503',
                after: String(OVERRIDDEN_STATUS),
            },
        ]);
        expect(missing.draft.status).toBe(404);
        expect(missing.steps).toEqual([]);
    });

    test('runResponse_WhenCandidateIsPreMatched_ShouldApplyWithoutReevaluating', () => {
        // Arrange
        const plan = statusRule(
            /* id: */ 'pre-matched',
            /* criterion: */ aCriterion(),
        );
        const candidates = [
            {
                entry: PipelineEntries.forWholeRule(plan)[0]!,
                isPreMatched: true,
            },
        ];
        const otherRequest = aRequestDraft({
            url: TEST_URLS.Orders,
        });

        // Act
        const result = RulePipeline.runResponse({
            candidates,
            request: otherRequest,
            response: aResponseDraft(),
            context: aRuleContext(),
        });

        // Assert
        expect(result.draft.status).toBe(OVERRIDDEN_STATUS);
    });

    test('runResponse_WhenCandidatesChain_ShouldLetLaterRulesSeeEarlierChanges', () => {
        // Arrange
        const breaker = statusRule(
            /* id: */ 'breaker',
            /* criterion: */ aCriterion(),
        );
        const tagger = planOf({
            id: 'tagger',
            type: RULE_TYPE_IDS.ResponseHeader,
            criteria: criteriaOf(SERVER_ERROR_STATUS),
            action: setHeader('X-Failed', 'yes'),
        });
        const candidates = RulePipeline.runRequest({
            entries: wholeRules([
                breaker,
                tagger,
            ]),
            draft: aRequestDraft(),
            context: aRuleContext(),
        }).responseCandidates;

        // Act
        const result = RulePipeline.runResponse({
            candidates,
            request: aRequestDraft(),
            response: aResponseDraft(),
            context: aRuleContext(),
        });

        // Assert
        expect(result.steps.map(step => step.plan.rule.id)).toEqual([
            'breaker',
            'tagger',
        ]);
        expect(result.draft.headers).toContainEqual({
            name: 'X-Failed',
            value: 'yes',
        });
    });

    test('runResponse_WhenPlanHasNoType_ShouldSkipIt', () => {
        // Arrange
        const plan = planOf({
            type: 'graphqlMock',
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
        const result = RulePipeline.runResponse({
            candidates,
            request: aRequestDraft(),
            response: aResponseDraft(),
            context: aRuleContext(),
        });

        // Assert
        expect(result.steps).toEqual([]);
        expect(result.draft).toEqual(aResponseDraft());
    });
});
