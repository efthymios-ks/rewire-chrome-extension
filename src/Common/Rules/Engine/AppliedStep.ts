import type { ValueChange } from '../../../Contracts/Rules/ValueChange';
import type { RulePlan } from './RulePlan';

export interface AppliedStep {
    plan: RulePlan;
    changes: ValueChange[];
}
