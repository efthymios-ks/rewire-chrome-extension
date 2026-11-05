import { type Criterion, CriteriaMatches, type RuleCriteria } from "../../../Contracts/Rules/Criterion";
import { Result } from "../../Results/Result";
import type { RuleContext } from "../Context/RuleContext";
import type { MatchFacts } from "../Drafts/Drafts";
import { CriterionFieldRegistry } from "./CriterionFields";
import { CriterionOperatorRegistry } from "./CriterionOperators";
import { CriterionStage } from "./CriterionStage";
import { type DnrCondition, DnrFragmentKind } from "./DnrFragment";

const OneRegexMessage = "With more than one URL, path, extension, host pattern or query condition the rule works on the inspected tab only.";

const EmptyFacts: MatchFacts = {
    request: {
        url: "",
        method: "",
        headers: [],
        body: null,
        resourceType: "",
        response: null,
    },
    response: null,
};

function isStatic(criterion: Criterion): boolean {
    return CriterionFieldRegistry.get(criterion.field)?.stage === CriterionStage.Static;
}

function staticPasses(criterion: Criterion, context: RuleContext): boolean {
    const field = CriterionFieldRegistry.get(criterion.field);
    const operator = CriterionOperatorRegistry.get(criterion.op);
    if (field === undefined || operator === undefined) {
        return false;
    }

    const values = field.read(
        EmptyFacts,
        criterion,
        context
    );

    return operator.test(values, criterion.value) !== criterion.negate;
}

function conditionOf(criteria: Criterion[]): Result<DnrCondition> {
    let condition: DnrCondition = {};
    for (const criterion of criteria) {
        const field = CriterionFieldRegistry.get(criterion.field);
        if (field === undefined) {
            return Result.fail(`Unknown criterion "${criterion.field}".`);
        }

        const fragment = field.toDnr(criterion);
        if (fragment.kind === DnrFragmentKind.Unsupported) {
            return Result.fail(fragment.reason);
        }

        if (fragment.kind === DnrFragmentKind.Regex && condition.regexFilter !== undefined) {
            return Result.fail(OneRegexMessage);
        }

        condition = fragment.kind === DnrFragmentKind.Regex
            ? {
                ...condition,
                regexFilter: fragment.source,
            }
            : {
                ...condition,
                ...fragment.patch,
            };
    }

    return Result.ok(condition);
}

export const CriteriaDnrCompiler = {
    staticallyAllows(criteria: RuleCriteria, context: RuleContext): boolean {
        const staticItems = criteria.items.filter(isStatic);
        if (staticItems.length === 0) {
            return true;
        }

        const passes = staticItems.map(criterion => staticPasses(criterion, context));
        if (criteria.match === CriteriaMatches.Any) {
            return passes.some(Boolean) || staticItems.length < criteria.items.length;
        }

        return passes.every(Boolean);
    },

    compile(criteria: RuleCriteria, context: RuleContext): Result<DnrCondition[]> {
        const dynamicItems = criteria.items.filter(criterion => !isStatic(criterion));
        if (!CriteriaDnrCompiler.staticallyAllows(criteria, context)) {
            return Result.ok([]);
        }

        if (criteria.match === CriteriaMatches.All || dynamicItems.length === 0) {
            const condition = conditionOf(dynamicItems);
            if (condition.hasErrors) {
                return condition;
            }

            return Result.ok([condition.value]);
        }

        const anyStaticPasses = criteria.items
            .filter(isStatic)
            .some(criterion => staticPasses(criterion, context));
        if (anyStaticPasses) {
            return Result.ok([{}]);
        }

        const conditions: DnrCondition[] = [];
        for (const criterion of dynamicItems) {
            const condition = conditionOf([criterion]);
            if (condition.hasErrors) {
                return condition;
            }

            conditions.push(condition.value);
        }

        return Result.ok(conditions);
    },
};
