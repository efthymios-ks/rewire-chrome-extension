import { ActiveProfile } from '../../../Common/Profiles/ActiveProfile';
import { ProfileVariables } from '../../../Common/Profiles/ProfileVariables';
import { InMemoryRuleContext } from '../../../Common/Rules/Context/InMemoryRuleContext';
import { CriteriaEvaluator } from '../../../Common/Rules/Criteria/CriteriaEvaluator';
import { RuleEnginePlanner } from '../../../Common/Rules/Engine/RuleEnginePlanner';
import type { RulePlan } from '../../../Common/Rules/Engine/RulePlan';
import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import type { Rule } from '../../../Contracts/Rules/Rule';
import type { PanelSettings } from '../../../Contracts/Settings/PanelSettings';

const EVERY_REQUEST_TEXT = 'Every request';

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

        return RuleEnginePlanner.planAll(
            /* rules: */ rules,
            /* context: */ RuleScopes.contextOf(settings),
        );
    },

    criteriaSummary(rule: Rule): string {
        if (rule.criteria.items.length === 0) {
            return EVERY_REQUEST_TEXT;
        }

        const joiner = rule.criteria.match === CRITERIA_MATCHES.Any ? ' or ' : ' and ';

        return rule.criteria.items
            .map(item => CriteriaEvaluator.describe(item))
            .join(joiner);
    },
};
