import type { RulePlan } from './RulePlan';

export interface PipelineEntry {
    plan: RulePlan;
    runsRequest: boolean;
    runsResponse: boolean;
}
