import { ActiveProfile } from "../../../Common/Profiles/ActiveProfile";
import { ProfileVariables } from "../../../Common/Profiles/ProfileVariables";
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
    contextOf(settings: PanelSettings): InMemoryRuleContext {
        return new InMemoryRuleContext(ProfileVariables.mapOf(ActiveProfile.variables(settings)));
    },

    planOf(rule: Rule, context: InMemoryRuleContext = new InMemoryRuleContext()): RulePlan {
        return RuleEnginePlanner.plan(rule, context);
    },

    plansOf(settings: PanelSettings): RulePlan[] {
        const rules = ActiveProfile
            .rules(settings)
            .filter(rule => rule.enabled);

        return RuleEnginePlanner.planAll(rules, RuleScopes.contextOf(settings));
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
