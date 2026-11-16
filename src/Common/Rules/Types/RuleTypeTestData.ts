import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';
import type { RuleType } from './RuleType';
import { RuleTypeRegistry } from './RuleTypeRegistry';

export function allRuleTypes(): RuleType[] {
    return Object
        .values(RULE_TYPE_IDS)
        .map(id => RuleTypeRegistry.get(id))
        .filter(type => type != null);
}
