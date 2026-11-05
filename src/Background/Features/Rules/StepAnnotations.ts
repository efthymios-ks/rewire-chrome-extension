import type { AppliedStep } from "../../../Common/Rules/Engine/RulePipeline";
import type { RuleEngine } from "../../../Contracts/Rules/RuleEngine";
import type { TimelineAnnotation } from "../../../Contracts/Timeline/TimelineAnnotation";

export const StepAnnotations = {
    of(
        steps: AppliedStep[],
        engine: RuleEngine,
        isAnsweredByRule: boolean
    ): TimelineAnnotation {
        return {
            appliedRules: steps.map(step => ({
                ruleId: step.plan.rule.id,
                ruleName: step.plan.rule.name,
                engine,
                note: step.plan.type?.label ?? "",
            })),
            changes: steps.flatMap(step => step.changes),
            isAnsweredByRule,
        };
    },
};
