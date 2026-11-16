import { describe, expect, test } from 'vitest';
import type { DnrCondition } from '../../Criteria/DnrCondition';
import { DelayRule } from './DelayRule';
import { aRequestDraft, aRuleContext } from '../../../../TestData';

const ruleType = new DelayRule();
const CONDITION: DnrCondition = {
    urlFilter: '||api.example.com',
};

describe('DelayRule', () => {
    test('defaultAction_WhenCreated_ShouldHoldTwoSeconds', () => {
        // Arrange
        const delayRule = new DelayRule();

        // Act
        const action = delayRule.defaultAction();

        // Assert
        expect(action).toEqual({
            delayMs: 2000,
        });
    });

    test.each([
        [
            1500,
            '1500 ms',
        ],
        [
            20000,
            '10000 ms',
        ],
        [
            '500',
            '0 ms',
        ],
    ])('summary_WhenDelayIs(%s)_ShouldShow(%s)', (delayMs, expected) => {
        // Arrange
        const action = {
            delayMs,
        };

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe(expected);
    });

    test.each([
        0,
        -250,
    ])('validate_WhenDelayIs(%s)_ShouldAskForALatencyAboveZero', delayMs => {
        // Arrange
        const action = {
            delayMs,
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(['Set a latency above 0.']);
    });

    test.each([
        [
            1500,
            1500,
        ],
        [
            20000,
            10000,
        ],
        [
            '500',
            0,
        ],
    ])('delayOf_WhenDelayIs(%s)_ShouldHold(%s)', (delayMs, expected) => {
        // Arrange
        const action = {
            delayMs,
        };

        // Act
        const delay = ruleType.delayOf(action);

        // Assert
        expect(delay).toBe(expected);
    });

    test('fields_WhenRead_ShouldOfferOnlyTheLatency', () => {
        // Arrange
        const expected = ['delayMs'];

        // Act
        const keys = ruleType.fields.map(field => field.key);

        // Assert
        expect(keys).toEqual(expected);
    });

    test('applyRequest_WhenCalled_ShouldLeaveTheRequestForTheEngineToHold', () => {
        // Arrange
        const action = {
            delayMs: 1000,
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context: aRuleContext(),
        });

        // Assert
        expect(draft).toEqual(aRequestDraft());
    });

    test('toDnr_WhenCalled_ShouldNeedTheDebugger', () => {
        // Arrange
        const action = ruleType.defaultAction();

        // Act
        const result = ruleType.toDnr({
            action,
            condition: CONDITION,
            context: aRuleContext(),
        });

        // Assert
        expect(result).toBeNull();
    });
});
