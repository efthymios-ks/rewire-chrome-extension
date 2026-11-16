import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import type { Criterion } from '../../../Contracts/Rules/Criterion';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import type { RuleCriteria } from '../../../Contracts/Rules/RuleCriteria';
import { RegexCache } from '../../Regex/RegexCache';
import type { RuleContext } from '../Context/RuleContext';
import type { MatchFacts } from '../Drafts/MatchFacts';
import type { CriteriaEvaluation } from './CriteriaEvaluation';
import { CRITERIA_OUTCOME } from './CriteriaOutcome';
import { CriterionFieldRegistry } from './CriterionFieldRegistry';
import { CriterionOperatorRegistry } from './CriterionOperatorRegistry';
import type { CriterionResult } from './CriterionResult';
import { CRITERION_STAGE, type CriterionStage } from './CriterionStage';
import { CriterionVerdict } from './CriterionVerdict';

const MISSING_VALUE_TEXT = '(none)';

interface EvaluateItemOptions {
    criterion: Criterion;
    facts: MatchFacts;
    context: RuleContext;
}

function evaluateItem({ criterion, facts, context }: EvaluateItemOptions): CriterionResult {
    const label = CriteriaEvaluator.describe(criterion);
    const field = CriterionFieldRegistry.get(criterion.field);
    const operator = CriterionOperatorRegistry.get(criterion.op);
    if (field == null || operator == null) {
        return {
            label,
            passed: false,
            actual: 'unknown field or operator',
        };
    }

    if (field.stage === CRITERION_STAGE.Response && facts.response == null) {
        return {
            label,
            passed: null,
            actual: 'known after the response',
        };
    }

    const values = field.read({ facts, criterion, context });
    const passed = CriterionVerdict.passes({ field, operator, criterion, values });

    return {
        label,
        passed,
        actual: values.length === 0 ? MISSING_VALUE_TEXT : values.join(', '),
    };
}

export interface EvaluateOptions {
    criteria: RuleCriteria;
    facts: MatchFacts;
    context: RuleContext;
}

export const CriteriaEvaluator = {
    evaluate({ criteria, facts, context }: EvaluateOptions): CriteriaEvaluation {
        const results = criteria.items.map(criterion => evaluateItem({ criterion, facts, context }));
        if (results.some(result => result.passed == null)) {
            return {
                outcome: CRITERIA_OUTCOME.Deferred,
                results,
            };
        }

        const passes = results.map(result => result.passed === true);
        const matched = criteria.match === CRITERIA_MATCHES.Any && passes.length > 0
            ? passes.some(Boolean)
            : passes.every(Boolean);

        return {
            outcome: matched ? CRITERIA_OUTCOME.Matched : CRITERIA_OUTCOME.NotMatched,
            results,
        };
    },

    describe(criterion: Criterion): string {
        const field = CriterionFieldRegistry.get(criterion.field);
        const operator = CriterionOperatorRegistry.get(criterion.op);
        const name = criterion.name === '' ? '' : ` "${criterion.name}"`;
        const value = operator?.needsValue === false ? '' : ` ${criterion.value}`;
        const text = `${field?.label ?? criterion.field}${name} ${operator?.label ?? criterion.op}${value}`;

        return criterion.negate ? `NOT (${text})` : text;
    },

    hasStage(criteria: RuleCriteria, stage: CriterionStage): boolean {
        return criteria.items.some(criterion => CriterionFieldRegistry.get(criterion.field)?.stage === stage);
    },

    validate(criteria: RuleCriteria): string[] {
        return criteria.items.flatMap(criterion => {
            const field = CriterionFieldRegistry.get(criterion.field);
            const operator = CriterionOperatorRegistry.get(criterion.op);
            if (field == null) {
                return [`Unknown criterion "${criterion.field}".`];
            }

            if (operator == null || !field.operators.includes(criterion.op)) {
                return [`${field.label} can't use "${criterion.op}".`];
            }

            if (field.needsName && criterion.name.trim() === '') {
                return [`${field.label} needs a name.`];
            }

            if (operator.needsValue && criterion.value.trim() === '') {
                return [`${field.label} needs a value.`];
            }

            const regex = criterion.op === CRITERION_OPERATOR_IDS.Regex
                ? RegexCache.compile(criterion.value)
                : null;
            if (regex?.hasErrors) {
                return [`${field.label} regex is invalid: ${regex.error}`];
            }

            return field.check?.(criterion) ?? [];
        });
    },
};
