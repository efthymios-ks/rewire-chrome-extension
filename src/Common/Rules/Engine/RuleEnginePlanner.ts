import type { Rule } from '../../../Contracts/Rules/Rule';
import { RULE_ENGINE } from '../../../Contracts/Rules/RuleEngine';
import { Result } from '../../Results/Result';
import type { RuleContext } from '../Context/RuleContext';
import { CriteriaDnrCompiler } from '../Criteria/CriteriaDnrCompiler';
import { CriteriaEvaluator } from '../Criteria/CriteriaEvaluator';
import { CRITERION_STAGE } from '../Criteria/CriterionStage';
import { DEFAULT_RESOURCE_TYPES } from '../Criteria/DefaultResourceTypes';
import type { DnrCondition } from '../Criteria/DnrCondition';
import type { DnrRuleDraft } from '../Types/DnrRuleDraft';
import type { RuleType } from '../Types/RuleType';
import { RuleTypeRegistry } from '../Types/RuleTypeRegistry';
import { PLANNER_REASONS } from './PlannerReasons';
import type { RulePlan } from './RulePlan';

function withDefaultResourceTypes(condition: DnrCondition): DnrCondition {
    if (condition.resourceTypes != null || condition.excludedResourceTypes != null) {
        return condition;
    }

    return {
        ...condition,
        resourceTypes: [...DEFAULT_RESOURCE_TYPES.Browser],
    };
}

interface BrowserRulesOfOptions {
    rule: Rule;
    type: RuleType;
    context: RuleContext;
}

function browserRulesOf({ rule, type, context }: BrowserRulesOfOptions): Result<DnrRuleDraft[] | null> {
    const conditions = CriteriaDnrCompiler.compile(rule.criteria, context);
    if (conditions.hasErrors) {
        return conditions;
    }

    if (conditions.value.length === 0) {
        const probe = type.toDnr({ action: rule.action, condition: {}, context, criteria: rule.criteria });
        if (probe == null || probe.hasErrors) {
            return probe ?? Result.ok(null);
        }

        return Result.ok([]);
    }

    const drafts: DnrRuleDraft[] = [];
    for (const condition of conditions.value) {
        const compiled = type.toDnr({
            action: rule.action,
            condition: withDefaultResourceTypes(condition),
            context,
            criteria: rule.criteria,
        });
        if (compiled == null) {
            return Result.ok(null);
        }

        if (compiled.hasErrors) {
            return compiled;
        }

        drafts.push(...compiled.value);
    }

    return Result.ok(drafts);
}

interface PlanOfOptions {
    rule: Rule;
    type: RuleType | null;
    fields: Partial<RulePlan>;
}

function planOf({ rule, type, fields }: PlanOfOptions): RulePlan {
    return {
        rule,
        type,
        engine: RULE_ENGINE.Invalid,
        errors: [],
        reason: '',
        browserRules: [],
        isStaticallyActive: true,
        delayMs: type?.delayOf(rule.action) ?? 0,
        ...fields,
    };
}

export const RuleEnginePlanner = {
    plan(rule: Rule, context: RuleContext): RulePlan {
        const type = RuleTypeRegistry.get(rule.type) ?? null;
        if (type == null) {
            return planOf({
                rule,
                type: null,
                fields: {
                    errors: [PLANNER_REASONS.UnknownType],
                    reason: PLANNER_REASONS.UnknownType,
                },
            });
        }

        const errors = [
            ...CriteriaEvaluator.validate(rule.criteria),
            ...type.validate(rule.action, rule.criteria),
        ];
        const hasResponseCriteria = CriteriaEvaluator.hasStage(rule.criteria, CRITERION_STAGE.Response);
        const isTooLate = hasResponseCriteria && !type.handlesResponse;
        if (errors.length > 0 || isTooLate) {
            return planOf({
                rule,
                type,
                fields: {
                    errors: isTooLate
                        ? [
                            ...errors,
                            PLANNER_REASONS.ResponseCriteriaTooLate,
                        ]
                        : errors,
                    reason: errors[0] ?? PLANNER_REASONS.ResponseCriteriaTooLate,
                },
            });
        }

        const isStaticallyActive = CriteriaDnrCompiler.staticallyAllows(rule.criteria, context);
        const debuggerPlan = (reason: string): RulePlan => planOf({
            rule,
            type,
            fields: {
                engine: RULE_ENGINE.Debugger,
                reason,
                isStaticallyActive,
            },
        });
        const browserRules = browserRulesOf({ rule, type, context });
        if (browserRules.hasErrors) {
            return debuggerPlan(browserRules.error);
        }

        if (browserRules.value == null) {
            return debuggerPlan(PLANNER_REASONS.TypeNeedsDebugger);
        }

        return planOf({
            rule,
            type,
            fields: {
                engine: type.runsOnBothEngines ? RULE_ENGINE.Both : RULE_ENGINE.Browser,
                reason: type.runsOnBothEngines ? PLANNER_REASONS.RunsOnBoth : PLANNER_REASONS.RunsInBrowser,
                browserRules: browserRules.value,
                isStaticallyActive,
            },
        });
    },

    planAll(rules: Rule[], context: RuleContext): RulePlan[] {
        return rules.map(rule => RuleEnginePlanner.plan(rule, context));
    },
};
