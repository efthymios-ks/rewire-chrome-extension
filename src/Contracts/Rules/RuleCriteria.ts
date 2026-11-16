import type { CriteriaMatch } from './CriteriaMatch';
import type { Criterion } from './Criterion';

export interface RuleCriteria {
    match: CriteriaMatch;
    items: Criterion[];
}
