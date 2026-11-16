import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import type { Criterion } from '../../../Contracts/Rules/Criterion';
import type { RuleCriteria } from '../../../Contracts/Rules/RuleCriteria';
import { Result } from '../../Results/Result';
import type { RuleContext } from '../Context/RuleContext';
import type { MatchFacts } from '../Drafts/MatchFacts';
import { CriterionFieldRegistry } from './CriterionFieldRegistry';
import { CriterionOperatorRegistry } from './CriterionOperatorRegistry';
import { CRITERION_STAGE } from './CriterionStage';
import { CriterionVerdict } from './CriterionVerdict';
import type { DnrCondition } from './DnrCondition';
import { DnrConditionMerge } from './DnrConditionMerge';
import type { DnrFragment } from './DnrFragment';
import { DNR_FRAGMENT_KIND } from './DnrFragmentKind';

const EMPTY_FACTS: MatchFacts = {
    request: {
        url: '',
        method: '',
        headers: [],
        body: null,
        resourceType: '',
        response: null,
    },
    response: null,
};

function isStatic(criterion: Criterion): boolean {
    return CriterionFieldRegistry.get(criterion.field)?.stage === CRITERION_STAGE.Static;
}

function staticPasses(criterion: Criterion, context: RuleContext): boolean {
    const field = CriterionFieldRegistry.get(criterion.field);
    const operator = CriterionOperatorRegistry.get(criterion.op);
    if (field == null || operator == null) {
        return false;
    }

    const values = field.read({ facts: EMPTY_FACTS, criterion, context });

    return CriterionVerdict.passes({ field, operator, criterion, values });
}

function patchOf(fragment: DnrFragment): Result<DnrCondition> {
    if (fragment.kind === DNR_FRAGMENT_KIND.Unsupported) {
        return Result.fail(fragment.reason);
    }

    return Result.ok(fragment.kind === DNR_FRAGMENT_KIND.Regex
        ? {
            regexFilter: fragment.source,
        }
        : fragment.patch);
}

function conditionOf(criteria: Criterion[]): Result<DnrCondition> {
    let condition: DnrCondition = {};
    for (const criterion of criteria) {
        const field = CriterionFieldRegistry.get(criterion.field);
        if (field == null) {
            return Result.fail(`Unknown criterion "${criterion.field}".`);
        }

        const patch = patchOf(field.toDnr(criterion));
        if (patch.hasErrors) {
            return patch;
        }

        const merged = DnrConditionMerge.merge(condition, patch.value);
        if (merged.hasErrors) {
            return merged;
        }

        condition = merged.value;
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
        if (criteria.match === CRITERIA_MATCHES.Any) {
            return passes.some(Boolean) || staticItems.length < criteria.items.length;
        }

        return passes.every(Boolean);
    },

    compile(criteria: RuleCriteria, context: RuleContext): Result<DnrCondition[]> {
        const dynamicItems = criteria.items.filter(criterion => !isStatic(criterion));
        if (!CriteriaDnrCompiler.staticallyAllows(criteria, context)) {
            return Result.ok([]);
        }

        if (criteria.match === CRITERIA_MATCHES.All || dynamicItems.length === 0) {
            const condition = conditionOf(dynamicItems);
            if (condition.hasErrors) {
                return condition;
            }

            return Result.ok([condition.value]);
        }

        const hasPassingStaticCriterion = criteria.items
            .filter(isStatic)
            .some(criterion => staticPasses(criterion, context));
        if (hasPassingStaticCriterion) {
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
