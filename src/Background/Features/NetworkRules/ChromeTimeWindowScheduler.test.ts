import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ChromeTimeWindowScheduler } from './ChromeTimeWindowScheduler';
import { TIME_WINDOW_ALARM_NAME } from './TimeWindowAlarmName';
import { InMemoryRuleContext } from '../../../Common/Rules/Context/InMemoryRuleContext';
import { RuleEnginePlanner } from '../../../Common/Rules/Engine/RuleEnginePlanner';
import type { Rule } from '../../../Contracts/Rules/Rule';
import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { aCriterion, aRule, createLogger } from '../../../TestData';

const NOW = new Date('2026-11-16T10:15:42.500Z');
const NEXT_MINUTE = new Date('2026-11-16T10:16:00.000Z').getTime();

function stubChrome() {
    const clear = vi.fn().mockResolvedValue(true);
    const create = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', {
        alarms: {
            clear,
            create,
        },
    });

    return {
        clear,
        create,
    };
}

function plansOf(rules: Rule[]) {
    return RuleEnginePlanner.planAll(
        /* rules: */ rules,
        /* context: */ new InMemoryRuleContext(),
    );
}

function aTimeWindowRule(): Rule {
    return aRule({
        criteria: {
            match: CRITERIA_MATCHES.All,
            items: [
                aCriterion(),
                aCriterion({
                    field: CRITERION_FIELD_IDS.TimeWindow,
                    op: 'between',
                    value: '09:00-17:00',
                }),
            ],
        },
    });
}

describe('ChromeTimeWindowScheduler', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    test('scheduleAsync_WhenARuleHasATimeWindow_ShouldWakeAtTheNextMinute', async () => {
        // Arrange
        const { clear, create } = stubChrome();
        const scheduler = new ChromeTimeWindowScheduler(createLogger());

        // Act
        await scheduler.scheduleAsync(plansOf([aRule(), aTimeWindowRule()]));

        // Assert
        expect(create).toHaveBeenCalledWith(
            /* name: */ TIME_WINDOW_ALARM_NAME,
            /* alarmInfo: */ {
                when: NEXT_MINUTE,
            },
        );
        expect(clear).not.toHaveBeenCalled();
    });

    test('scheduleAsync_WhenNoRuleHasATimeWindow_ShouldClearTheAlarm', async () => {
        // Arrange
        const { clear, create } = stubChrome();
        const scheduler = new ChromeTimeWindowScheduler(createLogger());

        // Act
        await scheduler.scheduleAsync(plansOf([aRule()]));

        // Assert
        expect(clear).toHaveBeenCalledWith(TIME_WINDOW_ALARM_NAME);
        expect(create).not.toHaveBeenCalled();
    });

    test('scheduleAsync_WhenChromeFails_ShouldLogAWarning', async () => {
        // Arrange
        const { create } = stubChrome();
        create.mockRejectedValue(new Error('Too many alarms'));
        const logger = createLogger();
        const scheduler = new ChromeTimeWindowScheduler(logger);

        // Act
        await scheduler.scheduleAsync(plansOf([aTimeWindowRule()]));

        // Assert
        expect(logger.warn).toHaveBeenCalledWith(
            /* message: */ 'Scheduling the time window check failed.',
            /* context: */ 'Too many alarms',
        );
    });
});
