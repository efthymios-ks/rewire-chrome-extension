import type { Criterion } from '../../../Contracts/Rules/Criterion';
import type { CriterionField } from './CriterionField';
import type { CriterionOperator } from './CriterionOperators';

export interface PassesOptions {
    field: CriterionField;
    operator: CriterionOperator;
    criterion: Criterion;
    values: string[];
}

export const CriterionVerdict = {
    passes({ field, operator, criterion, values }: PassesOptions): boolean {
        const isMatch = operator.test({
            values,
            expected: field.expectedOf?.(criterion) ?? criterion.value,
            isCaseInsensitive: field.isCaseInsensitive === true,
        });

        return isMatch !== criterion.negate;
    },
};
