import type { DnrResourceType } from './DnrResourceType';
import { RESOURCE_TYPE_OPTIONS, type ResourceTypeOption } from './ResourceTypeOption';

function optionOf(id: string): ResourceTypeOption | undefined {
    return RESOURCE_TYPE_OPTIONS.find(option => option.id === id);
}

export const ResourceTypes = {
    idsOfDebuggerType(debuggerType: string): string[] {
        const ids = RESOURCE_TYPE_OPTIONS
            .filter(option => option.debuggerTypes.includes(debuggerType))
            .map(option => option.id);

        return ids.length === 0 ? [debuggerType.toLowerCase()] : ids;
    },

    isKnown(id: string): boolean {
        return optionOf(id) != null;
    },

    browserTypesOf(ids: string[]): DnrResourceType[] {
        const types = ids.flatMap(id => optionOf(id)?.browserTypes ?? []);

        return [...new Set(types)];
    },

    debuggerTypesOf(ids: string[]): string[] {
        const types = ids.flatMap(id => optionOf(id)?.debuggerTypes ?? []);

        return [...new Set(types)];
    },
};
