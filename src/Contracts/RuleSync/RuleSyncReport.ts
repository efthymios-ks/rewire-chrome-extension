import type { RuleSyncFailure } from "./RuleSyncFailure";

export interface RuleSyncReport {
    syncedAt: string;
    activeRuleCount: number;
    failures: RuleSyncFailure[];
}
