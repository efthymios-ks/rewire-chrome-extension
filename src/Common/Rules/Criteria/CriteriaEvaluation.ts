import type { CriteriaOutcome } from './CriteriaOutcome';
import type { CriterionResult } from './CriterionResult';

export interface CriteriaEvaluation {
    outcome: CriteriaOutcome;
    results: CriterionResult[];
}
