import { ErrorText } from '../../../Common/Errors/ErrorText';
import type { Logger } from '../../../Common/Logging/Logger';
import type { RulePlan } from '../../../Common/Rules/Engine/RulePlan';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { TIME_WINDOW_ALARM_NAME } from './TimeWindowAlarmName';
import type { TimeWindowScheduler } from './TimeWindowScheduler';

const MILLISECONDS_PER_MINUTE = 60_000;

export class ChromeTimeWindowScheduler implements TimeWindowScheduler {
    private readonly _logger: Logger;

    constructor(logger: Logger) {
        this._logger = logger;
    }

    async scheduleAsync(plans: RulePlan[]): Promise<void> {
        const hasTimeWindows = plans.some(plan => plan.rule.criteria.items
            .some(criterion => criterion.field === CRITERION_FIELD_IDS.TimeWindow));
        try {
            if (!hasTimeWindows) {
                await chrome.alarms.clear(TIME_WINDOW_ALARM_NAME);

                return;
            }

            const currentMinute = Math.floor(Date.now() / MILLISECONDS_PER_MINUTE);
            const nextMinute = (currentMinute + 1) * MILLISECONDS_PER_MINUTE;
            await chrome.alarms.create(TIME_WINDOW_ALARM_NAME, {
                when: nextMinute,
            });
        } catch (error) {
            this._logger.warn(
                /* message: */ 'Scheduling the time window check failed.',
                /* context: */ ErrorText.of(error),
            );
        }
    }
}
