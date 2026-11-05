import { InMemoryRuleContext } from "../../../Common/Rules/Context/InMemoryRuleContext";
import { CriteriaEvaluator } from "../../../Common/Rules/Criteria/CriteriaEvaluator";
import { RuleEnginePlanner } from "../../../Common/Rules/Engine/RuleEnginePlanner";
import type { RulePlan } from "../../../Common/Rules/Engine/RulePlan";
import { CriteriaMatches } from "../../../Contracts/Rules/Criterion";
import type { Rule } from "../../../Contracts/Rules/Rule";
import { RuleEngine } from "../../../Contracts/Rules/RuleEngine";
import type { PanelSettings } from "../../../Contracts/Settings/PanelSettings";

export interface ScopeAppearance {
    label: string;
    className: string;
}

export const ScopeAppearances: Record<RuleEngine, ScopeAppearance> = {
    [RuleEngine.Browser]: {
        label: "All tabs",
        className: "scope-browser",
    },
    [RuleEngine.Debugger]: {
        label: "Inspected tab",
        className: "scope-debugger",
    },
    [RuleEngine.Both]: {
        label: "All tabs",
        className: "scope-both",
    },
    [RuleEngine.Invalid]: {
        label: "Invalid",
        className: "scope-invalid",
    },
};

const EveryRequestText = "Every request";

export const RuleScopes = {
    contextOf(): InMemoryRuleContext {
        return new InMemoryRuleContext();
    },

    planOf(rule: Rule): RulePlan {
        return RuleEnginePlanner.plan(rule, RuleScopes.contextOf());
    },

    plansOf(settings: PanelSettings): RulePlan[] {
        const rules = settings.rules.filter(rule => rule.enabled);

        return RuleEnginePlanner.planAll(rules, RuleScopes.contextOf());
    },

    criteriaSummary(rule: Rule): string {
        if (rule.criteria.items.length === 0) {
            return EveryRequestText;
        }

        const joiner = rule.criteria.match === CriteriaMatches.Any ? " or " : " and ";

        return rule.criteria.items
            .map(item => CriteriaEvaluator.describe(item))
            .join(joiner);
    },
};
