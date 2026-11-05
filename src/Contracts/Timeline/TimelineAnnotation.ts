import type { AppliedRule } from "../Rules/AppliedRule";
import type { ValueChange } from "../Rules/ValueChange";

export interface TimelineAnnotation {
    appliedRules: AppliedRule[];
    changes: ValueChange[];
    isAnsweredByRule: boolean;
}
