import { describe, expect, test } from 'vitest';
import { PLANNER_REASONS } from './PlannerReasons';
import { RuleEnginePlanner } from './RuleEnginePlanner';
import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import type { RuleAction } from '../../../Contracts/Rules/RuleAction';
import { RULE_ENGINE } from '../../../Contracts/Rules/RuleEngine';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';
import { FixedRuleContext } from '../../../FixedRuleContext';
import { aCriterion, aRule, aRuleContext } from '../../../TestData';

const USERS_REGEX = '^.*/api/v1/users/.*$';

const OFFICE_HOURS = aCriterion({
    field: CRITERION_FIELD_IDS.TimeWindow,
    op: CRITERION_OPERATOR_IDS.Between,
    value: '09:00-17:00',
});

const BEFORE_OFFICE = new FixedRuleContext(new Date('2026-11-06T08:00:00'));

const SERVER_ERROR_STATUS = aCriterion({
    field: CRITERION_FIELD_IDS.ResponseStatus,
    op: CRITERION_OPERATOR_IDS.Range,
    value: '5xx',
});

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

describe('RuleEnginePlanner', () => {
    test('plan_WhenTypeIsUnknown_ShouldBeInvalid', () => {
        // Arrange
        const rule = aRule({
            type: 'graphqlMock',
        });

        // Act
        const plan = RuleEnginePlanner.plan(
            /* rule: */ rule,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Invalid);
        expect(plan.type).toBeNull();
        expect(plan.errors).toEqual([PLANNER_REASONS.UnknownType]);
        expect(plan.reason).toBe(PLANNER_REASONS.UnknownType);
    });

    test('plan_WhenCriteriaAndActionAreInvalid_ShouldBeInvalidWithFirstErrorAsReason', () => {
        // Arrange
        const rule = aRule({
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion({
                        value: '',
                    }),
                ],
            },
            action: {
                status: 999,
            },
        });

        // Act
        const plan = RuleEnginePlanner.plan(
            /* rule: */ rule,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Invalid);
        expect(plan.errors).toEqual([
            'URL needs a value.',
            'Status must be a whole number from 100 to 599.',
        ]);
        expect(plan.reason).toBe('URL needs a value.');
    });

    test('plan_WhenRequestOnlyTypeHasResponseCriteria_ShouldBeInvalid', () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.RequestHeader,
            action: setHeader('X-Env', 'staging'),
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion(),
                    SERVER_ERROR_STATUS,
                ],
            },
        });

        // Act
        const plan = RuleEnginePlanner.plan(
            /* rule: */ rule,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Invalid);
        expect(plan.errors).toEqual([PLANNER_REASONS.ResponseCriteriaTooLate]);
        expect(plan.reason).toBe(PLANNER_REASONS.ResponseCriteriaTooLate);
    });

    test('plan_WhenResponseTypeHasResponseCriteria_ShouldUseDebuggerWithCompileReason', () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.MockResponse,
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [SERVER_ERROR_STATUS],
            },
            action: {
                overrideStatus: true,
                status: 200,
                overrideBody: false,
            },
        });

        // Act
        const plan = RuleEnginePlanner.plan(
            /* rule: */ rule,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Debugger);
        expect(plan.errors).toEqual([]);
        expect(plan.reason).toBe('Response status conditions work on the inspected tab only.');
    });

    test('plan_WhenRuleIsLatency_ShouldRunOnTheInspectedTabWithItsDelay', () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.Delay,
            action: {
                delayMs: 1500,
            },
        });

        // Act
        const plan = RuleEnginePlanner.plan(
            /* rule: */ rule,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Debugger);
        expect(plan.reason).toBe(PLANNER_REASONS.TypeNeedsDebugger);
        expect(plan.delayMs).toBe(1500);
        expect(plan.browserRules).toEqual([]);
    });

    test('plan_WhenAnotherTypeCarriesAnOldDelay_ShouldIgnoreIt', () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.RequestHeader,
            action: {
                ...setHeader('X-Env', 'staging'),
                delayMs: 1500,
            },
        });

        // Act
        const plan = RuleEnginePlanner.plan(
            /* rule: */ rule,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Browser);
        expect(plan.delayMs).toBe(0);
    });

    test('plan_WhenTypeCompilesForBrowser_ShouldRunInBrowserWithDefaultResourceTypes', () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.RequestHeader,
            action: setHeader('X-Env', 'staging'),
        });

        // Act
        const plan = RuleEnginePlanner.plan(
            /* rule: */ rule,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Browser);
        expect(plan.reason).toBe(PLANNER_REASONS.RunsInBrowser);
        expect(plan.isStaticallyActive).toBe(true);
        expect(plan.browserRules).toEqual([
            {
                action: {
                    type: 'modifyHeaders',
                    requestHeaders: [
                        {
                            header: 'X-Env',
                            operation: 'set',
                            value: 'staging',
                        },
                    ],
                },
                condition: {
                    regexFilter: USERS_REGEX,
                    resourceTypes: [
                        'xmlhttprequest',
                        'other',
                        'main_frame',
                        'sub_frame',
                    ],
                },
            },
        ]);
    });

    test.each([
        [
            false,
            {
                regexFilter: USERS_REGEX,
                resourceTypes: ['script'],
            },
        ],
        [
            true,
            {
                regexFilter: USERS_REGEX,
                excludedResourceTypes: ['script'],
            },
        ],
    ])('plan_WhenCriteriaNameResourceTypesAndNegateIs(%s)_ShouldKeepThemInsteadOfDefaults', (
        isNegated,
        expectedCondition,
    ) => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.RequestHeader,
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion(),
                    aCriterion({
                        field: CRITERION_FIELD_IDS.ResourceType,
                        op: CRITERION_OPERATOR_IDS.OneOf,
                        value: 'script',
                        negate: isNegated,
                    }),
                ],
            },
            action: setHeader('X-Env', 'staging'),
        });

        // Act
        const plan = RuleEnginePlanner.plan(
            /* rule: */ rule,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plan.browserRules.map(browserRule => browserRule.condition)).toEqual([expectedCondition]);
    });

    test('plan_WhenMatchAnyHasSeveralRegexItems_ShouldEmitOneBrowserRulePerItem', () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.RequestHeader,
            criteria: {
                match: CRITERIA_MATCHES.Any,
                items: [
                    aCriterion(),
                    aCriterion({
                        field: CRITERION_FIELD_IDS.Extension,
                        op: CRITERION_OPERATOR_IDS.OneOf,
                        value: 'json',
                    }),
                ],
            },
            action: setHeader('X-Env', 'staging'),
        });

        // Act
        const plan = RuleEnginePlanner.plan(
            /* rule: */ rule,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Browser);
        expect(plan.browserRules).toHaveLength(2);
        expect(plan.browserRules.map(browserRule => browserRule.condition.resourceTypes)).toEqual([
            [
                'xmlhttprequest',
                'other',
                'main_frame',
                'sub_frame',
            ],
            [
                'xmlhttprequest',
                'other',
                'main_frame',
                'sub_frame',
            ],
        ]);
    });

    test('plan_WhenTypeRunsOnBothEngines_ShouldPlanBoth', () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.Cors,
            action: {},
        });

        // Act
        const plan = RuleEnginePlanner.plan(
            /* rule: */ rule,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Both);
        expect(plan.reason).toBe(PLANNER_REASONS.RunsOnBoth);
        expect(plan.browserRules).toHaveLength(1);
    });

    test('plan_WhenCriteriaCannotCompileForBrowser_ShouldUseDebuggerWithCompileReason', () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.RequestHeader,
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion({
                        field: CRITERION_FIELD_IDS.RequestHeader,
                        op: CRITERION_OPERATOR_IDS.Exists,
                        name: 'Authorization',
                    }),
                ],
            },
            action: setHeader('X-Env', 'staging'),
        });

        // Act
        const plan = RuleEnginePlanner.plan(
            /* rule: */ rule,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Debugger);
        expect(plan.reason).toBe('Request header conditions work on the inspected tab only.');
        expect(plan.errors).toEqual([]);
    });

    test('plan_WhenTwoHostExclusionsAreCombined_ShouldExcludeBothInTheBrowserRule', () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.RequestHeader,
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion({
                        field: CRITERION_FIELD_IDS.Host,
                        op: CRITERION_OPERATOR_IDS.Domains,
                        value: 'cdn.example.com',
                        negate: true,
                    }),
                    aCriterion({
                        field: CRITERION_FIELD_IDS.Host,
                        op: CRITERION_OPERATOR_IDS.Domains,
                        value: 'ads.example.com',
                        negate: true,
                    }),
                ],
            },
            action: setHeader('X-Env', 'staging'),
        });

        // Act
        const plan = RuleEnginePlanner.plan(
            /* rule: */ rule,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Browser);
        expect(plan.browserRules.map(browserRule => browserRule.condition.excludedRequestDomains)).toEqual([
            [
                'cdn.example.com',
                'ads.example.com',
            ],
        ]);
    });

    test('plan_WhenCombinedListsCanNeverMatch_ShouldUseDebuggerInsteadOfABroadBrowserRule', () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.RequestHeader,
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion({
                        field: CRITERION_FIELD_IDS.Method,
                        op: CRITERION_OPERATOR_IDS.OneOf,
                        value: 'GET',
                    }),
                    aCriterion({
                        field: CRITERION_FIELD_IDS.Method,
                        op: CRITERION_OPERATOR_IDS.OneOf,
                        value: 'POST',
                    }),
                ],
            },
            action: setHeader('X-Env', 'staging'),
        });

        // Act
        const plan = RuleEnginePlanner.plan(
            /* rule: */ rule,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Debugger);
        expect(plan.reason).toContain('can never match the same request');
        expect(plan.browserRules).toEqual([]);
    });

    test('plan_WhenResourceTypeIsMistyped_ShouldBeInvalid', () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.RequestHeader,
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion({
                        field: CRITERION_FIELD_IDS.ResourceType,
                        op: CRITERION_OPERATOR_IDS.OneOf,
                        value: 'scirpt',
                    }),
                ],
            },
            action: setHeader('X-Env', 'staging'),
        });

        // Act
        const plan = RuleEnginePlanner.plan(
            /* rule: */ rule,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Invalid);
        expect(plan.reason).toContain('Resource type "scirpt" is not known.');
        expect(plan.browserRules).toEqual([]);
    });

    test('plan_WhenTypeHasNoBrowserForm_ShouldUseDebugger', () => {
        // Arrange
        const rule = aRule();

        // Act
        const plan = RuleEnginePlanner.plan(
            /* rule: */ rule,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Debugger);
        expect(plan.reason).toBe(PLANNER_REASONS.TypeNeedsDebugger);
        expect(plan.delayMs).toBe(0);
    });

    test('plan_WhenStaticCriteriaFail_ShouldMarkRuleStaticallyInactiveWithoutBrowserRules', () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.RequestHeader,
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion(),
                    OFFICE_HOURS,
                ],
            },
            action: setHeader('X-Env', 'staging'),
        });

        // Act
        const plan = RuleEnginePlanner.plan(rule, BEFORE_OFFICE);

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Browser);
        expect(plan.isStaticallyActive).toBe(false);
        expect(plan.browserRules).toEqual([]);
    });

    test('plan_WhenStaticCriteriaFailForDebuggerOnlyType_ShouldStillPlanDebugger', () => {
        // Arrange
        const rule = aRule({
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion(),
                    OFFICE_HOURS,
                ],
            },
        });

        // Act
        const plan = RuleEnginePlanner.plan(rule, BEFORE_OFFICE);

        // Assert
        expect(plan.engine).toBe(RULE_ENGINE.Debugger);
        expect(plan.reason).toBe(PLANNER_REASONS.TypeNeedsDebugger);
        expect(plan.isStaticallyActive).toBe(false);
    });

    test('planAll_WhenRulesAreGiven_ShouldPlanEachInOrder', () => {
        // Arrange
        const rules = [
            aRule({
                id: 'mock',
            }),
            aRule({
                id: 'unknown',
                type: 'graphqlMock',
            }),
        ];

        // Act
        const plans = RuleEnginePlanner.planAll(
            /* rules: */ rules,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(plans.map(plan => plan.rule.id)).toEqual([
            'mock',
            'unknown',
        ]);
        expect(plans.map(plan => plan.engine)).toEqual([
            RULE_ENGINE.Debugger,
            RULE_ENGINE.Invalid,
        ]);
    });
});
