import type { TimelineAnnotation } from "../../../Contracts/Timeline/TimelineAnnotation";
import type { TimelineRecord } from "./TimelineRecord";

export const TimelineAnnotations = {
    applyTo(record: TimelineRecord, annotation: TimelineAnnotation): TimelineRecord {
        const existingRuleIds = new Set(record.summary.appliedRules.map(rule => rule.ruleId));
        const newRules = annotation.appliedRules.filter(rule => !existingRuleIds.has(rule.ruleId));
        if (newRules.length === 0 && annotation.changes.length === 0 && !annotation.isAnsweredByRule) {
            return record;
        }

        return {
            ...record,
            changes: [
                ...record.changes,
                ...annotation.changes,
            ],
            summary: {
                ...record.summary,
                appliedRules: [
                    ...record.summary.appliedRules,
                    ...newRules,
                ],
                isAnsweredByRule: record.summary.isAnsweredByRule || annotation.isAnsweredByRule,
            },
        };
    },

    isTouchedByRule(record: TimelineRecord): boolean {
        return record.summary.appliedRules.length > 0 || record.summary.redirectedFromUrl !== null;
    },
};
