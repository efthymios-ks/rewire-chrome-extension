import { type CriterionOperator, CRITERION_OPERATORS } from './CriterionOperators';

export const CriterionOperatorRegistry = {
    get(id: string): CriterionOperator | undefined {
        return CRITERION_OPERATORS.find(operator => operator.id === id);
    },
};
