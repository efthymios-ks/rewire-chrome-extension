import { describe, expect, test, vi } from 'vitest';
import { RollOnceRuleContext } from './RollOnceRuleContext';
import type { Criterion } from '../../../Contracts/Rules/Criterion';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import { aCriterion, aRuleContext } from '../../../TestData';

function aSample(): Criterion {
    return aCriterion({
        field: CRITERION_FIELD_IDS.Sample,
        op: CRITERION_OPERATOR_IDS.Percent,
        value: '50',
    });
}

describe('RollOnceRuleContext', () => {
    test('sampleRoll_WhenTheSameCriterionRollsAgain_ShouldReplayTheFirstRoll', () => {
        // Arrange
        const context = new RollOnceRuleContext(aRuleContext());
        const criterion = aSample();

        // Act
        const first = context.sampleRoll(criterion);
        const second = context.sampleRoll(criterion);

        // Assert
        expect(second).toBe(first);
    });

    test('sampleRoll_WhenCriteriaDiffer_ShouldRollEachFromTheInnerContext', () => {
        // Arrange
        const inner = aRuleContext();
        vi.spyOn(inner, 'random')
            .mockReturnValueOnce(0.1)
            .mockReturnValueOnce(0.9);
        const context = new RollOnceRuleContext(inner);

        // Act
        const first = context.sampleRoll(aSample());
        const second = context.sampleRoll(aSample());

        // Assert
        expect(first).toBe(0.1);
        expect(second).toBe(0.9);
    });

    test('setVariable_WhenCalled_ShouldWriteThroughToTheInnerContext', () => {
        // Arrange
        const inner = aRuleContext();
        const context = new RollOnceRuleContext(inner);

        // Act
        context.setVariable('token', 'abc');

        // Assert
        expect(inner.variable('token')).toBe('abc');
        expect(context.render('Bearer {{token}}')).toBe('Bearer abc');
    });
});
