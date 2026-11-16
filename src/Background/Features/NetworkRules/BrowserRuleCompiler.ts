import type { RulePlan } from '../../../Common/Rules/Engine/RulePlan';
import { RULE_ENGINE } from '../../../Contracts/Rules/RuleEngine';
import type { RuleSyncFailure } from '../../../Contracts/RuleSync/RuleSyncFailure';
import { BROWSER_RULE_PRIORITIES } from './BrowserRulePriorities';
import type { DnrRuleOwner } from './DnrRuleOwner';

const FIRST_DNR_RULE_ID = 1;

export interface CompiledRule {
    rule: chrome.declarativeNetRequest.Rule;
    sourceName: string;
    settingId: string;
}

export interface BrowserRuleSet {
    rules: CompiledRule[];
    failures: RuleSyncFailure[];
}

export const BrowserRuleCompiler = {
    compile(plans: RulePlan[]): BrowserRuleSet {
        const failures: RuleSyncFailure[] = [];
        const placedDrafts = plans.flatMap((plan, index) => {
            const sourceName = plan.rule.name === '' ? (plan.type?.label ?? plan.rule.type) : plan.rule.name;
            if (plan.engine === RULE_ENGINE.Invalid) {
                failures.push({
                    sourceName,
                    ruleId: plan.rule.id,
                    message: plan.reason,
                });

                return [];
            }

            return plan.browserRules.map(draft => ({
                draft,
                priority: BROWSER_RULE_PRIORITIES.FirstRule + index,
                sourceName,
                settingId: plan.rule.id,
            }));
        });
        const rules: CompiledRule[] = placedDrafts.map((placed, position) => ({
            rule: {
                id: FIRST_DNR_RULE_ID + position,
                priority: placed.priority,
                action: placed.draft.action,
                condition: placed.draft.condition,
            },
            sourceName: placed.sourceName,
            settingId: placed.settingId,
        }));

        return {
            rules,
            failures,
        };
    },

    ownersOf(rules: CompiledRule[]): DnrRuleOwner[] {
        return rules.map(compiled => ({
            dnrRuleId: compiled.rule.id,
            ruleId: compiled.settingId,
        }));
    },
};
