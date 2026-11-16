import { describe, expect, test, vi } from 'vitest';
import type { RuleType } from '../Types/RuleType';
import { RuleTypeRegistry } from '../Types/RuleTypeRegistry';
import { PipelineEntries } from './PipelineEntries';
import type { RulePlan } from './RulePlan';
import { RULE_ENGINE, type RuleEngine } from '../../../Contracts/Rules/RuleEngine';
import { aRule } from '../../../TestData';

interface ATypeOptions {
    atRequest: boolean;
    atResponse: boolean;
}

function aType({ atRequest, atResponse }: ATypeOptions): RuleType {
    const type: RuleType = Object.create(RuleTypeRegistry.get(aRule().type)!);

    return Object.assign(type, {
        runsAtRequest: vi.fn(() => atRequest),
        runsAtResponse: vi.fn(() => atResponse),
    });
}

interface APlanOptions {
    engine: RuleEngine;
    type?: RuleType | null;
    id?: string;
}

function aPlan({
    engine,
    type = aType({ atRequest: true, atResponse: true }),
    id = 'rule-1',
}: APlanOptions): RulePlan {
    return {
        rule: aRule({
            id,
        }),
        type,
        engine,
        errors: [],
        reason: '',
        browserRules: [],
        isStaticallyActive: true,
        delayMs: 0,
    };
}

describe('PipelineEntries', () => {
    test.each([
        [
            RULE_ENGINE.Debugger,
            true,
            true,
        ],
        [
            RULE_ENGINE.Both,
            true,
            false,
        ],
    ])('forDebugger_WhenEngineIs(%s)_ShouldRunRequest(%s)AndResponse(%s)', (
        engine,
        runsRequest,
        runsResponse,
    ) => {
        // Arrange
        const plan = aPlan({
            engine,
        });

        // Act
        const entries = PipelineEntries.forDebugger([plan]);

        // Assert
        expect(entries).toEqual([
            {
                plan,
                runsRequest,
                runsResponse,
            },
        ]);
    });

    test.each([
        RULE_ENGINE.Browser,
        RULE_ENGINE.Invalid,
    ])('forDebugger_WhenEngineIs(%s)_ShouldSkipThePlan', engine => {
        // Arrange
        const plan = aPlan({
            engine,
        });

        // Act
        const entries = PipelineEntries.forDebugger([plan]);

        // Assert
        expect(entries).toEqual([]);
    });

    test.each([
        [
            RULE_ENGINE.Browser,
            true,
            true,
        ],
        [
            RULE_ENGINE.Both,
            false,
            true,
        ],
    ])('forBrowser_WhenEngineIs(%s)_ShouldRunRequest(%s)AndResponse(%s)', (
        engine,
        runsRequest,
        runsResponse,
    ) => {
        // Arrange
        const plan = aPlan({
            engine,
        });

        // Act
        const entries = PipelineEntries.forBrowser([plan]);

        // Assert
        expect(entries).toEqual([
            {
                plan,
                runsRequest,
                runsResponse,
            },
        ]);
    });

    test.each([
        RULE_ENGINE.Debugger,
        RULE_ENGINE.Invalid,
    ])('forBrowser_WhenEngineIs(%s)_ShouldSkipThePlan', engine => {
        // Arrange
        const plan = aPlan({
            engine,
        });

        // Act
        const entries = PipelineEntries.forBrowser([plan]);

        // Assert
        expect(entries).toEqual([]);
    });

    test('forDebugger_WhenThePlanHasNoType_ShouldSkipIt', () => {
        // Arrange
        const plan = aPlan({
            engine: RULE_ENGINE.Debugger,
            type: null,
        });

        // Act
        const entries = PipelineEntries.forDebugger([plan]);

        // Assert
        expect(entries).toEqual([]);
    });

    test('forBrowser_WhenThePlanHasNoType_ShouldSkipIt', () => {
        // Arrange
        const plan = aPlan({
            engine: RULE_ENGINE.Browser,
            type: null,
        });

        // Act
        const entries = PipelineEntries.forBrowser([plan]);

        // Assert
        expect(entries).toEqual([]);
    });

    test('forDebugger_WhenTheTypeDeclinesBothStages_ShouldStillListThePlanWithNoStages', () => {
        // Arrange
        const plan = aPlan({
            engine: RULE_ENGINE.Debugger,
            type: aType({ atRequest: false, atResponse: false }),
        });

        // Act
        const entries = PipelineEntries.forDebugger([plan]);

        // Assert
        expect(entries).toEqual([
            {
                plan,
                runsRequest: false,
                runsResponse: false,
            },
        ]);
    });

    test('forDebugger_WhenAsked_ShouldPassTheRuleActionAndCriteriaToTheType', () => {
        // Arrange
        const type = aType({ atRequest: true, atResponse: true });
        const plan = aPlan({
            engine: RULE_ENGINE.Debugger,
            type,
        });

        // Act
        PipelineEntries.forDebugger([plan]);

        // Assert
        expect(type.runsAtRequest).toHaveBeenCalledWith(plan.rule.action);
        expect(type.runsAtResponse).toHaveBeenCalledWith(plan.rule.action, plan.rule.criteria);
    });

    test('forDebugger_WhenPlansAreMixed_ShouldKeepTheirOrder', () => {
        // Arrange
        const first = aPlan({
            engine: RULE_ENGINE.Both,
            id: 'first',
        });
        const skipped = aPlan({
            engine: RULE_ENGINE.Browser,
            id: 'skipped',
        });
        const last = aPlan({
            engine: RULE_ENGINE.Debugger,
            id: 'last',
        });

        // Act
        const entries = PipelineEntries.forDebugger([
            first,
            skipped,
            last,
        ]);

        // Assert
        expect(entries.map(entry => entry.plan.rule.id)).toEqual([
            'first',
            'last',
        ]);
    });

    test.each([
        RULE_ENGINE.Browser,
        RULE_ENGINE.Debugger,
        RULE_ENGINE.Both,
    ])('forWholeRule_WhenEngineIs(%s)_ShouldRunWhatTheTypeAsks', engine => {
        // Arrange
        const plan = aPlan({
            engine,
            type: aType({ atRequest: false, atResponse: true }),
        });

        // Act
        const entries = PipelineEntries.forWholeRule(plan);

        // Assert
        expect(entries).toEqual([
            {
                plan,
                runsRequest: false,
                runsResponse: true,
            },
        ]);
    });

    test('forWholeRule_WhenEngineIsInvalid_ShouldSkipThePlan', () => {
        // Arrange
        const plan = aPlan({
            engine: RULE_ENGINE.Invalid,
        });

        // Act
        const entries = PipelineEntries.forWholeRule(plan);

        // Assert
        expect(entries).toEqual([]);
    });

    test('forWholeRule_WhenThePlanHasNoType_ShouldSkipIt', () => {
        // Arrange
        const plan = aPlan({
            engine: RULE_ENGINE.Both,
            type: null,
        });

        // Act
        const entries = PipelineEntries.forWholeRule(plan);

        // Assert
        expect(entries).toEqual([]);
    });

    test('forWholeRules_WhenPlansAreMixed_ShouldKeepOnlyRunnableOnesInOrder', () => {
        // Arrange
        const plans = [
            aPlan({
                engine: RULE_ENGINE.Browser,
                id: 'browser',
            }),
            aPlan({
                engine: RULE_ENGINE.Invalid,
                id: 'invalid',
            }),
            aPlan({
                engine: RULE_ENGINE.Debugger,
                id: 'untyped',
                type: null,
            }),
            aPlan({
                engine: RULE_ENGINE.Both,
                id: 'both',
            }),
        ];

        // Act
        const entries = PipelineEntries.forWholeRules(plans);

        // Assert
        expect(entries.map(entry => entry.plan.rule.id)).toEqual([
            'browser',
            'both',
        ]);
    });

    test('forWholeRules_WhenThereAreNoPlans_ShouldReturnNoEntries', () => {
        // Act
        const entries = PipelineEntries.forWholeRules([]);

        // Assert
        expect(entries).toEqual([]);
    });
});
