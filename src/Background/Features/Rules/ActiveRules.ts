import type { RuleContext } from '../../../Common/Rules/Context/RuleContext';
import type { PipelineEntry } from '../../../Common/Rules/Engine/PipelineEntry';
import type { RulePlan } from '../../../Common/Rules/Engine/RulePlan';

export interface ActiveRules {
    isEnabled(): boolean;
    plans(): RulePlan[];
    context(): RuleContext;
    simulationContext(): RuleContext;
    debuggerEntries(): PipelineEntry[];
    browserEntries(): PipelineEntry[];
    wholeEntries(): PipelineEntry[];
    subscribe(listener: () => void): void;
}
