import type { CriterionField } from './CriterionField';
import { CRITERION_FIELDS } from './CriterionFields';

export const CriterionFieldRegistry = {
    get(id: string): CriterionField | undefined {
        return CRITERION_FIELDS.find(field => field.id === id);
    },
};
