import { type Criterion, CriteriaMatches, CriterionOperatorIds, type RuleCriteria } from "../../../Contracts/Rules/Criterion";
import type { RuleContext } from "../Context/RuleContext";
import type { MatchFacts } from "../Drafts/Drafts";
import { CriterionFieldRegistry } from "./CriterionFields";
import { CriterionOperatorRegistry } from "./CriterionOperators";
import { CriterionStage } from "./CriterionStage";
import { RegexCache } from "./RegexCache";

export enum CriteriaOutcome {
    Matched = 1,
    NotMatched = 2,
    Deferred = 3,
}

export interface CriterionResult {
    label: string;
    passed: boolean | null;
    actual: string;
}

export interface CriteriaEvaluation {
    outcome: CriteriaOutcome;
    results: CriterionResult[];
}

const MissingValueText = "(none)";

function evaluateItem(
    criterion: Criterion,
    facts: MatchFacts,
    context: RuleContext
): CriterionResult {
    const label = CriteriaEvaluator.describe(criterion);
    const field = CriterionFieldRegistry.get(criterion.field);
    const operator = CriterionOperatorRegistry.get(criterion.op);
    if (field === undefined || operator === undefined) {
        return {
            label,
            passed: false,
            actual: "unknown field or operator",
        };
    }

    if (field.stage === CriterionStage.Response && facts.response === null) {
        return {
            label,
            passed: null,
            actual: "known after the response",
        };
    }

    const values = field.read(
        facts,
        criterion,
        context
    );
    const passed = operator.test(values, criterion.value) !== criterion.negate;

    return {
        label,
        passed,
        actual: values.length === 0 ? MissingValueText : values.join(", "),
    };
}

export const CriteriaEvaluator = {
    evaluate(
        criteria: RuleCriteria,
        facts: MatchFacts,
        context: RuleContext
    ): CriteriaEvaluation {
        const results = criteria.items.map(criterion => evaluateItem(
            criterion,
            facts,
            context
        ));
        if (results.some(result => result.passed === null)) {
            return {
                outcome: CriteriaOutcome.Deferred,
                results,
            };
        }

        const passes = results.map(result => result.passed === true);
        const matched = criteria.match === CriteriaMatches.Any && passes.length > 0
            ? passes.some(Boolean)
            : passes.every(Boolean);

        return {
            outcome: matched ? CriteriaOutcome.Matched : CriteriaOutcome.NotMatched,
            results,
        };
    },

    describe(criterion: Criterion): string {
        const field = CriterionFieldRegistry.get(criterion.field);
        const operator = CriterionOperatorRegistry.get(criterion.op);
        const name = criterion.name === "" ? "" : ` "${criterion.name}"`;
        const value = operator?.needsValue === false ? "" : ` ${criterion.value}`;
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
            if (field === undefined) {
                return [`Unknown criterion "${criterion.field}".`];
            }

            if (operator === undefined || !field.operators.includes(criterion.op)) {
                return [`${field.label} can't use "${criterion.op}".`];
            }

            if (field.needsName && criterion.name.trim() === "") {
                return [`${field.label} needs a name.`];
            }

            if (operator.needsValue && criterion.value.trim() === "") {
                return [`${field.label} needs a value.`];
            }

            const regex = criterion.op === CriterionOperatorIds.Regex ? RegexCache.compile(criterion.value) : null;
            if (regex !== null && regex.hasErrors) {
                return [`${field.label} regex is invalid: ${regex.error}`];
            }

            return [];
        });
    },
};
