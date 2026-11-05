import { ErrorText } from "../../../Common/Errors/ErrorText";
import type { ILogger } from "../../../Common/Logging/ILogger";
import type { RulePlan } from "../../../Common/Rules/Engine/RulePlan";
import { CriterionFieldIds } from "../../../Contracts/Rules/Criterion";

export const TimeWindowAlarmName = "rewire.timeWindow";

const MillisecondsPerMinute = 60_000;

export interface ITimeWindowScheduler {
    schedule(plans: RulePlan[]): Promise<void>;
}

export class TimeWindowScheduler implements ITimeWindowScheduler {
    private readonly _logger: ILogger;

    constructor(logger: ILogger) {
        this._logger = logger;
    }

    async schedule(plans: RulePlan[]): Promise<void> {
        const hasTimeWindows = plans.some(plan => plan.rule.criteria.items.some(criterion => criterion.field === CriterionFieldIds.TimeWindow));
        try {
            if (!hasTimeWindows) {
                await chrome.alarms.clear(TimeWindowAlarmName);

                return;
            }

            const nextMinute = (Math.floor(Date.now() / MillisecondsPerMinute) + 1) * MillisecondsPerMinute;
            await chrome.alarms.create(TimeWindowAlarmName, {
                when: nextMinute,
            });
        } catch (error) {
            this._logger.warn("Scheduling the time window check failed.", ErrorText.of(error));
        }
    }
}
