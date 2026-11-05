import type { Rule } from "../../../Contracts/Rules/Rule";
import { RuleEngine } from "../../../Contracts/Rules/RuleEngine";
import { Result } from "../../Results/Result";
import type { RuleContext } from "../Context/RuleContext";
import { CriteriaDnrCompiler } from "../Criteria/CriteriaDnrCompiler";
import { CriteriaEvaluator } from "../Criteria/CriteriaEvaluator";
import { CriterionStage } from "../Criteria/CriterionStage";
import type { DnrCondition } from "../Criteria/DnrFragment";
import { DefaultResourceTypes } from "../Criteria/ResourceTypes";
import type { DnrRuleDraft } from "../Types/DnrRuleDraft";
import type { IRuleType } from "../Types/IRuleType";
import { RuleTypeRegistry } from "../Types/RuleTypeRegistry";
import type { RulePlan } from "./RulePlan";

export const PlannerReasons = {
    UnknownType: "This rule type is not known; it may come from a later version.",
    ResponseCriteriaTooLate: "This rule acts before the response, so response conditions can never match it.",
    TypeNeedsDebugger: "This rule type works on the inspected tab only.",
    RunsInBrowser: "Works on every tab.",
    RunsOnBoth: "Works on every tab; CORS preflights are answered on the inspected tab only.",
} as const;

function withDefaultResourceTypes(condition: DnrCondition): DnrCondition {
    if (condition.resourceTypes !== undefined || condition.excludedResourceTypes !== undefined) {
        return condition;
    }

    return {
        ...condition,
        resourceTypes: [...DefaultResourceTypes.Browser],
    };
}

function browserRulesOf(
    rule: Rule,
    type: IRuleType,
    context: RuleContext
): Result<DnrRuleDraft[] | null> {
    const conditions = CriteriaDnrCompiler.compile(rule.criteria, context);
    if (conditions.hasErrors) {
        return conditions;
    }

    if (conditions.value.length === 0) {
        const probe = type.toDnr(
            rule.action,
            {},
            context,
            rule.criteria
        );
        if (probe === null || probe.hasErrors) {
            return probe ?? Result.ok(null);
        }

        return Result.ok([]);
    }

    const drafts: DnrRuleDraft[] = [];
    for (const condition of conditions.value) {
        const compiled = type.toDnr(
            rule.action,
            withDefaultResourceTypes(condition),
            context,
            rule.criteria
        );
        if (compiled === null) {
            return Result.ok(null);
        }

        if (compiled.hasErrors) {
            return compiled;
        }

        drafts.push(...compiled.value);
    }

    return Result.ok(drafts);
}

function planOf(
    rule: Rule,
    type: IRuleType | null,
    fields: Partial<RulePlan>
): RulePlan {
    return {
        rule,
        type,
        engine: RuleEngine.Invalid,
        errors: [],
        reason: "",
        browserRules: [],
        isStaticallyActive: true,
        delayMs: type?.delayOf(rule.action) ?? 0,
        ...fields,
    };
}

export const RuleEnginePlanner = {
    plan(rule: Rule, context: RuleContext): RulePlan {
        const type = RuleTypeRegistry.get(rule.type) ?? null;
        if (type === null) {
            return planOf(
                rule,
                null,
                {
                    errors: [PlannerReasons.UnknownType],
                    reason: PlannerReasons.UnknownType,
                }
            );
        }

        const errors = [
            ...CriteriaEvaluator.validate(rule.criteria),
            ...type.validate(rule.action, rule.criteria),
        ];
        const tooLate = CriteriaEvaluator.hasStage(rule.criteria, CriterionStage.Response) && !type.handlesResponse;
        if (errors.length > 0 || tooLate) {
            return planOf(
                rule,
                type,
                {
                    errors: tooLate
                        ? [
                            ...errors,
                            PlannerReasons.ResponseCriteriaTooLate,
                        ]
                        : errors,
                    reason: errors[0] ?? PlannerReasons.ResponseCriteriaTooLate,
                }
            );
        }

        const isStaticallyActive = CriteriaDnrCompiler.staticallyAllows(rule.criteria, context);
        const debuggerPlan = (reason: string): RulePlan => planOf(
            rule,
            type,
            {
                engine: RuleEngine.Debugger,
                reason,
                isStaticallyActive,
            }
        );
        const browserRules = browserRulesOf(
            rule,
            type,
            context
        );
        if (browserRules.hasErrors) {
            return debuggerPlan(browserRules.error);
        }

        if (browserRules.value === null) {
            return debuggerPlan(PlannerReasons.TypeNeedsDebugger);
        }

        return planOf(
            rule,
            type,
            {
                engine: type.runsOnBothEngines ? RuleEngine.Both : RuleEngine.Browser,
                reason: type.runsOnBothEngines ? PlannerReasons.RunsOnBoth : PlannerReasons.RunsInBrowser,
                browserRules: browserRules.value,
                isStaticallyActive,
            }
        );
    },

    planAll(rules: Rule[], context: RuleContext): RulePlan[] {
        return rules.map(rule => RuleEnginePlanner.plan(rule, context));
    },
};
