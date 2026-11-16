import type { RulePlan } from '../../../Common/Rules/Engine/RulePlan';

export interface TimeWindowScheduler {
    scheduleAsync(plans: RulePlan[]): Promise<void>;
}
