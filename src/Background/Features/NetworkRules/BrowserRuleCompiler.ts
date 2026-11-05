import type { RulePlan } from "../../../Common/Rules/Engine/RulePlan";
import { RuleEngine } from "../../../Contracts/Rules/RuleEngine";
import type { RuleSyncFailure } from "../../../Contracts/RuleSync/RuleSyncFailure";

export const BrowserRulePriorities = {
    FirstRule: 1,
} as const;

const FirstDnrRuleId = 1;

export interface DnrRuleOwner {
    dnrRuleId: number;
    ruleId: string;
}

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
        let nextId = FirstDnrRuleId;
        const rules: CompiledRule[] = [];
        const failures: RuleSyncFailure[] = [];

        plans.forEach((plan, index) => {
            const sourceName = plan.rule.name || plan.type?.label || plan.rule.type;
            if (plan.engine === RuleEngine.Invalid) {
                failures.push({
                    sourceName,
                    settingId: plan.rule.id,
                    message: plan.reason,
                });

                return;
            }

            plan.browserRules.forEach(draft => rules.push({
                rule: {
                    id: nextId++,
                    priority: BrowserRulePriorities.FirstRule + index,
                    action: draft.action,
                    condition: draft.condition,
                },
                sourceName,
                settingId: plan.rule.id,
            }));
        });

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
