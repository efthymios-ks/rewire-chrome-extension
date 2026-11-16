import { describe, expect, test } from 'vitest';
import { TimelineAnnotations } from './TimelineAnnotations';
import type { AppliedRule } from '../../../Contracts/Rules/AppliedRule';
import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { RULE_ENGINE } from '../../../Contracts/Rules/RuleEngine';
import type { TimelineAnnotation } from '../../../Contracts/Timeline/TimelineAnnotation';
import { aSummary } from '../../../TestData';
import { aTimelineRecord } from '../../BackgroundTestData';

function anAppliedRule(ruleId: string): AppliedRule {
    return {
        ruleId,
        ruleName: `Rule ${ruleId}`,
        engine: RULE_ENGINE.Debugger,
        note: 'Request header',
    };
}

function anAnnotation(overrides: Partial<TimelineAnnotation> = {}): TimelineAnnotation {
    return {
        appliedRules: [],
        changes: [],
        isAnsweredByRule: false,
        ...overrides,
    };
}

describe('TimelineAnnotations', () => {
    test('applyTo_WhenTheRuleIsAlreadyListed_ShouldListItOnceAndKeepTheChanges', () => {
        // Arrange
        const record = aTimelineRecord({
            summary: aSummary({
                appliedRules: [
                    anAppliedRule('rule-1'),
                ],
            }),
        });
        const annotation = anAnnotation({
            appliedRules: [
                anAppliedRule('rule-1'),
                anAppliedRule('rule-2'),
            ],
            changes: [
                {
                    area: CHANGE_AREA.RequestHeader,
                    name: 'x-debug',
                    before: null,
                    after: '1',
                },
            ],
        });

        // Act
        const annotated = TimelineAnnotations.applyTo(record, annotation);

        // Assert
        expect(annotated.summary.appliedRules.map(rule => rule.ruleId)).toEqual([
            'rule-1',
            'rule-2',
        ]);
        expect(annotated.changes).toHaveLength(1);
    });

    test('applyTo_WhenTheAnnotationAddsNothing_ShouldReturnTheSameRecord', () => {
        // Arrange
        const record = aTimelineRecord();

        // Act
        const annotated = TimelineAnnotations.applyTo(
            /* record: */ record,
            /* annotation: */ anAnnotation(),
        );

        // Assert
        expect(annotated).toBe(record);
    });

    test('applyTo_WhenARuleAnsweredTheCall_ShouldMarkItAnswered', () => {
        // Arrange
        const annotation = anAnnotation({
            isAnsweredByRule: true,
        });

        // Act
        const annotated = TimelineAnnotations.applyTo(
            /* record: */ aTimelineRecord(),
            /* annotation: */ annotation,
        );

        // Assert
        expect(annotated.summary.isAnsweredByRule).toBe(true);
    });
});
