import { CriteriaMatches, CriterionFieldIds, type Criterion, type RuleCriteria } from "../../../Contracts/Rules/Criterion";
import { DefaultResourceTypes, ResourceTypes } from "./ResourceTypes";

const ListSeparatorPattern = /[\s,]+/;

const DefaultDebuggerScope: string[] = [...DefaultResourceTypes.Debugger];

function typeItemsOf(criteria: RuleCriteria): Criterion[] {
    return criteria.items.filter(item => item.field === CriterionFieldIds.ResourceType);
}

function idsOf(item: Criterion): string[] {
    return item.value
        .split(ListSeparatorPattern)
        .map(value => value.trim().toLowerCase())
        .filter(value => value.length > 0);
}

export const ResourceScope = {
    hasExplicitTypes(criteria: RuleCriteria): boolean {
        return typeItemsOf(criteria).length > 0;
    },

    allows(criteria: RuleCriteria, debuggerType: string): boolean {
        return ResourceScope.hasExplicitTypes(criteria) || DefaultDebuggerScope.includes(debuggerType);
    },

    debuggerTypesOf(criteria: RuleCriteria): string[] | null {
        const items = typeItemsOf(criteria);
        if (items.length === 0) {
            return [...DefaultDebuggerScope];
        }

        const isOpen = criteria.match === CriteriaMatches.Any || items.some(item => item.negate);
        if (isOpen) {
            return null;
        }

        const types = items.flatMap(item => ResourceTypes.debuggerTypesOf(idsOf(item)));

        return [...new Set(types)];
    },
};
