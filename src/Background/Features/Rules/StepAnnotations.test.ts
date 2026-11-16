import { describe, expect, test } from 'vitest';
import { StepAnnotations } from './StepAnnotations';
import { InMemoryRuleContext } from '../../../Common/Rules/Context/InMemoryRuleContext';
import type { RulePlan } from '../../../Common/Rules/Engine/RulePlan';
import { RuleEnginePlanner } from '../../../Common/Rules/Engine/RuleEnginePlanner';
import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { RULE_ENGINE } from '../../../Contracts/Rules/RuleEngine';
import type { ValueChange } from '../../../Contracts/Rules/ValueChange';
import { aRule } from '../../../TestData';

function aPlan(id: string): RulePlan {
    const [plan] = RuleEnginePlanner.planAll(
        /* rules: */ [
            aRule({
                id,
                name: `${id} name`,
            }),
        ],
        /* context: */ new InMemoryRuleContext(),
    );
    if (plan == null) {
        throw new Error('The rule was not planned.');
    }

    return plan;
}

function aChange(name: string): ValueChange {
    return {
        area: CHANGE_AREA.ResponseHeader,
        name,
        before: null,
        after: 'yes',
    };
}

describe('StepAnnotations', () => {
    test('of_WhenStepsApplied_ShouldListEachRuleAndAllTheirChanges', () => {
        // Arrange
        const steps = [
            {
                plan: aPlan('rule-1'),
                changes: [aChange('X-First')],
            },
            {
                plan: aPlan('rule-2'),
                changes: [aChange('X-Second'), aChange('X-Third')],
            },
        ];

        // Act
        const annotation = StepAnnotations.of({
            steps,
            engine: RULE_ENGINE.Debugger,
            isAnsweredByRule: true,
        });

        // Assert
        expect(annotation).toEqual({
            appliedRules: [
                {
                    ruleId: 'rule-1',
                    ruleName: 'rule-1 name',
                    engine: RULE_ENGINE.Debugger,
                    note: 'Mock response',
                },
                {
                    ruleId: 'rule-2',
                    ruleName: 'rule-2 name',
                    engine: RULE_ENGINE.Debugger,
                    note: 'Mock response',
                },
            ],
            changes: [aChange('X-First'), aChange('X-Second'), aChange('X-Third')],
            isAnsweredByRule: true,
        });
    });

    test('of_WhenTheRuleTypeIsUnknown_ShouldLeaveTheNoteEmpty', () => {
        // Arrange
        const steps = [
            {
                plan: {
                    ...aPlan('rule-1'),
                    type: null,
                },
                changes: [],
            },
        ];

        // Act
        const annotation = StepAnnotations.of({
            steps,
            engine: RULE_ENGINE.Browser,
            isAnsweredByRule: false,
        });

        // Assert
        expect(annotation.appliedRules[0]?.note).toBe('');
    });

    test('of_WhenNoStepsApplied_ShouldBeEmpty', () => {
        // Arrange
        const steps: [] = [];

        // Act
        const annotation = StepAnnotations.of({
            steps,
            engine: RULE_ENGINE.Browser,
            isAnsweredByRule: false,
        });

        // Assert
        expect(annotation).toEqual({
            appliedRules: [],
            changes: [],
            isAnsweredByRule: false,
        });
    });
});
