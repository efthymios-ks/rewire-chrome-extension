import type { RuleAction } from './RuleAction';
import type { RuleCriteria } from './RuleCriteria';

export interface Rule {
    id: string;
    name: string;
    enabled: boolean;
    type: string;
    criteria: RuleCriteria;
    action: RuleAction;
}
