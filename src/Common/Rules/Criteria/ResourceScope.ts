import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import type { Criterion } from '../../../Contracts/Rules/Criterion';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import type { RuleCriteria } from '../../../Contracts/Rules/RuleCriteria';
import { criterionValuesOf } from './criterionValuesOf';
import { DEFAULT_RESOURCE_TYPES } from './DefaultResourceTypes';
import { ResourceTypes } from './ResourceTypes';

const DEFAULT_DEBUGGER_SCOPE: string[] = [...DEFAULT_RESOURCE_TYPES.Debugger];

function typeItemsOf(criteria: RuleCriteria): Criterion[] {
    return criteria.items.filter(item => item.field === CRITERION_FIELD_IDS.ResourceType);
}

export const ResourceScope = {
    hasExplicitTypes(criteria: RuleCriteria): boolean {
        return typeItemsOf(criteria).length > 0;
    },

    allows(criteria: RuleCriteria, debuggerType: string): boolean {
        return ResourceScope.hasExplicitTypes(criteria) || DEFAULT_DEBUGGER_SCOPE.includes(debuggerType);
    },

    debuggerTypesOf(criteria: RuleCriteria): string[] | null {
        const items = typeItemsOf(criteria);
        if (items.length === 0) {
            return [...DEFAULT_DEBUGGER_SCOPE];
        }

        const isOpen = criteria.match === CRITERIA_MATCHES.Any || items.some(item => item.negate);
        if (isOpen) {
            return null;
        }

        const types = items.flatMap(item => ResourceTypes.debuggerTypesOf(criterionValuesOf(item.value)));

        return [...new Set(types)];
    },
};
