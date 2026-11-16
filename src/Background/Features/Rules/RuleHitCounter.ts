import type { DnrRuleOwner } from '../NetworkRules/DnrRuleOwner';

export interface RuleHitCounter {
    count(ruleId: string): void;
    setOwners(owners: DnrRuleOwner[]): void;
    startPolling(): void;
    stopPolling(): void;
}
